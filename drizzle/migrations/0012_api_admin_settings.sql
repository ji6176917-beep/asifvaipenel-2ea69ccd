ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS api_global_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS api_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_min_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_allow_new_keys boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS api_docs text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_instructions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS api_examples text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.ensure_my_api_key(_regenerate boolean DEFAULT false)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
declare _uid uuid := auth.uid(); _k text; _p profiles; _set site_settings;
begin
  if _uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into _set from site_settings where id=1;
  if not _set.api_global_enabled then raise exception 'API_OFF'; end if;
  select * into _p from profiles where id=_uid for update;
  if _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if (_p.api_key_hash is not null or _p.api_key_created_at is not null) and not _p.api_enabled then raise exception 'API_DISABLED'; end if;
  if _p.api_key is not null and not _regenerate then return _p.api_key; end if;
  if _p.api_key is null and not _set.api_allow_new_keys then raise exception 'NEW_KEYS_CLOSED'; end if;
  _k := 'sk_' || encode(gen_random_bytes(24),'hex');
  update profiles set api_key=_k, api_key_hash=encode(digest(_k,'sha256'),'hex'),
    api_key_created_at=now(), api_enabled=true
  where id=_uid;
  return _k;
end $function$;

CREATE OR REPLACE FUNCTION public.api_place_order(_uid uuid, _service_id uuid, _link text, _quantity integer)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare _p profiles; _s services; _c categories; _pl platforms; _set site_settings; _charge numeric; _code text; _newbal numeric;
begin
  select * into _set from site_settings where id=1;
  if not _set.api_global_enabled then raise exception 'API_OFF'; end if;
  if not _set.allow_orders then raise exception 'ORDERS_PAUSED'; end if;
  select * into _p from profiles where id=_uid for update;
  if not found or _p.banned or _p.deleted_at is not null then raise exception 'ACCOUNT_SUSPENDED'; end if;
  if not _p.api_enabled then raise exception 'API_DISABLED'; end if;
  if _p.balance < _set.api_min_balance then raise exception 'BELOW_MIN_BALANCE'; end if;
  select * into _s from services where id=_service_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _c from categories where id=_s.category_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  select * into _pl from platforms where id=_c.platform_id and active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;
  if _quantity < _s.min_qty or _quantity > _s.max_qty then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
  if _link !~* '^https?://[^\s]+\.[^\s]+' or length(_link) > 500 then raise exception 'INVALID_LINK'; end if;
  _charge := ceil(_quantity * _s.rate / _s.rate_per * 100) / 100;
  if _p.balance < _charge then raise exception 'INSUFFICIENT_BALANCE'; end if;
  loop
    _code := lpad((floor(random()*9000000000)+1000000000)::bigint::text,10,'0');
    exit when not exists (select 1 from orders where order_code=_code);
  end loop;
  _newbal := _p.balance - _charge;
  update profiles set balance=_newbal where id=_uid;
  insert into orders (order_code,user_id,service_id,platform_slug,platform_name,category_name,service_name,link,quantity,charge,idempotency_key,source)
  values (_code,_uid,_s.id,_pl.slug,_pl.name,_c.name,_s.name,_link,_quantity,_charge,'api-'||gen_random_uuid(),'api');
  insert into wallet_ledger (user_id,amount,kind,ref,balance_after) values (_uid,-_charge,'order',_code,_newbal);
  return json_build_object('order', _code, 'charge', _charge, 'balance', _newbal);
end $function$;