UPDATE public.site_settings SET require_screenshot = false;
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