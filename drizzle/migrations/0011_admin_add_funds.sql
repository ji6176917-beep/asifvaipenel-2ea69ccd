ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS deposit_min numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deposit_max numeric NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS require_screenshot boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_deposit(_method_id uuid, _amount numeric, _txn text, _screenshot text, _idem text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _uid uuid := auth.uid(); _p profiles; _m payment_methods; _set site_settings; _existing deposits; _code text;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into _existing from deposits where user_id=_uid and idempotency_key=_idem;
  if found then return json_build_object('code', _existing.code); end if;
  select * into _set from site_settings where id=1;
  select * into _p from profiles where id=_uid;
  if _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if _set.require_verified_email and not exists (select 1 from auth.users where id=_uid and email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_VERIFIED'; end if;
  select * into _m from payment_methods where id=_method_id and active and deleted_at is null;
  if not found then raise exception 'METHOD_UNAVAILABLE'; end if;
  _amount := round(_amount, 2);
  if _amount < greatest(_m.min_amount, _set.deposit_min) or _amount > least(_m.max_amount, _set.deposit_max) then raise exception 'AMOUNT_OUT_OF_RANGE'; end if;
  _txn := trim(_txn);
  if length(_txn) < 4 or length(_txn) > 100 then raise exception 'INVALID_TXN'; end if;
  if exists (select 1 from deposits where method_id=_m.id and lower(txn_id)=lower(_txn)) then raise exception 'DUPLICATE_TXN'; end if;
  if _set.require_screenshot and _screenshot is null then raise exception 'SCREENSHOT_REQUIRED'; end if;
  if _screenshot is not null and _screenshot not like _uid::text || '/%' then raise exception 'INVALID_SCREENSHOT'; end if;
  loop
    _code := 'ADD-' || lpad((floor(random()*900000)+100000)::int::text,6,'0');
    exit when not exists (select 1 from deposits where code=_code);
  end loop;
  insert into deposits (code,user_id,method_id,method_name,method_kind,amount,bdt_rate,bdt_amount,txn_id,screenshot_path,idempotency_key)
  values (_code,_uid,_m.id,_m.name,_m.kind,_amount,
    case when _m.kind='p2p' then _set.bdt_rate end,
    case when _m.kind='p2p' then round(_amount*_set.bdt_rate,2) end,
    _txn,_screenshot,_idem);
  return json_build_object('code', _code);
end $function$;

-- Admin review: approve / reject (from pending) and reverse (final -> opposite). Service role only.
CREATE OR REPLACE FUNCTION public.admin_review_deposit(_deposit_id uuid, _action text, _note text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _d deposits; _new deposit_status; _delta numeric := 0; _bal numeric; _newbal numeric; _kind text; _title text;
begin
  select * into _d from deposits where id=_deposit_id and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  _note := nullif(left(trim(coalesce(_note,'')),500),'');
  if _action = 'approve' then
    if _d.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
    _new := 'approved'; _delta := _d.amount; _kind := 'deposit';
  elsif _action = 'reject' then
    if _d.status <> 'pending' then raise exception 'INVALID_TRANSITION'; end if;
    _new := 'rejected';
  elsif _action = 'reverse' then
    if _d.status = 'approved' then _new := 'rejected'; _delta := -_d.amount; _kind := 'deposit_reversal';
    elsif _d.status = 'rejected' then _new := 'approved'; _delta := _d.amount; _kind := 'deposit';
    elsif _d.status = 'cancelled' then _new := 'pending';
    else raise exception 'INVALID_TRANSITION'; end if;
  else raise exception 'INVALID_ACTION'; end if;
  if _delta <> 0 then
    select balance into _bal from profiles where id=_d.user_id for update;
    _newbal := _bal + _delta;
    if _newbal < 0 then raise exception 'INSUFFICIENT_BALANCE'; end if;
    update profiles set balance=_newbal where id=_d.user_id;
    insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_d.user_id,_delta,_kind,_d.code,_newbal);
  end if;
  update deposits set status=_new, admin_note=coalesce(_note, admin_note), reviewed_at=now(), updated_at=now() where id=_d.id;
  _title := 'Add Fund #' || _d.code || ' ' || case _new when 'approved' then 'approved' when 'rejected' then 'was rejected' when 'pending' then 'is pending again' else _new::text end;
  insert into notifications (user_id,title,body,kind) values (_d.user_id,_title,
    concat_ws(E'\n', case when _delta > 0 then '$' || to_char(_delta,'FM999999990.00') || ' added to your balance.'
                          when _delta < 0 then '$' || to_char(-_delta,'FM999999990.00') || ' deducted from your balance.' end, _note), 'notification');
  return json_build_object('status', _new, 'delta', _delta, 'old_status', _d.status);
end $function$;

REVOKE EXECUTE ON FUNCTION public.admin_review_deposit(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_deposit(uuid, text, text) TO service_role;