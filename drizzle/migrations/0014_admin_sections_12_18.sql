CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS home_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS languages_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS support_hours text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_float boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS maintenance_on boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_text text NOT NULL DEFAULT 'We are doing a quick upgrade. Please check back soon.',
  ADD COLUMN IF NOT EXISTS allow_signups boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cookie_notice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocked_email_domains text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS session_timeout_min integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.qna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.qna TO anon, authenticated;
GRANT ALL ON public.qna TO service_role;
ALTER TABLE public.qna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public qna" ON public.qna FOR SELECT TO anon, authenticated USING (active AND deleted_at IS NULL);

CREATE TABLE IF NOT EXISTS public.pages (
  slug text PRIMARY KEY,
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_custom boolean NOT NULL DEFAULT false,
  show_in_footer boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public pages" ON public.pages FOR SELECT TO anon, authenticated USING (active AND deleted_at IS NULL);

CREATE TABLE IF NOT EXISTS public.page_versions (
  id bigserial PRIMARY KEY,
  slug text NOT NULL,
  title jsonb NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.page_versions TO service_role;
GRANT USAGE ON SEQUENCE public.page_versions_id_seq TO service_role;
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'popup',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image text,
  link text,
  button text,
  expires_at timestamptz,
  show_once boolean NOT NULL DEFAULT true,
  target text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS broadcast_id uuid,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS button text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS show_once boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS notifications_broadcast_idx ON public.notifications(broadcast_id);

CREATE TABLE IF NOT EXISTS public.telegram_config (
  id integer PRIMARY KEY DEFAULT 1,
  bot_token text,
  chat_id text,
  on_order boolean NOT NULL DEFAULT true,
  on_deposit boolean NOT NULL DEFAULT true,
  on_user boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.telegram_config TO service_role;
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.telegram_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.telegram_log (
  id bigserial PRIMARY KEY,
  event text NOT NULL,
  request_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_log TO service_role;
GRANT USAGE ON SEQUENCE public.telegram_log_id_seq TO service_role;
ALTER TABLE public.telegram_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tg_send(_event text, _text text, _force boolean DEFAULT false)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
declare _c telegram_config; _rid bigint;
begin
  select * into _c from telegram_config where id=1;
  if _c.bot_token is null or _c.chat_id is null or _c.bot_token = '' or _c.chat_id = '' then return null; end if;
  if not _force and ((_event='order' and not _c.on_order) or (_event='deposit' and not _c.on_deposit) or (_event='user' and not _c.on_user)) then return null; end if;
  select net.http_post(
    url := 'https://api.telegram.org/bot' || _c.bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', _c.chat_id, 'text', _text),
    headers := '{"Content-Type":"application/json"}'::jsonb) into _rid;
  insert into telegram_log(event, request_id) values (_event, _rid);
  delete from telegram_log where id not in (select id from telegram_log order by id desc limit 50);
  return _rid;
exception when others then
  insert into telegram_log(event, request_id) values (_event || ':error ' || left(sqlerrm, 100), null);
  return null;
end $$;
REVOKE ALL ON FUNCTION public.tg_send(text, text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_send(text, text, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.tg_on_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if TG_TABLE_NAME = 'orders' then
    perform tg_send('order', 'New order #' || NEW.order_code || E'\n' || NEW.platform_name || ' · ' || NEW.service_name || E'\nQty ' || NEW.quantity || ' · $' || NEW.charge || E'\n' || NEW.link);
  elsif TG_TABLE_NAME = 'deposits' then
    perform tg_send('deposit', 'New add-funds request ' || NEW.code || E'\n' || NEW.method_name || ' · $' || NEW.amount || E'\nTxn: ' || NEW.txn_id);
  elsif TG_TABLE_NAME = 'profiles' then
    perform tg_send('user', 'New user ' || NEW.username || ' (' || NEW.public_id || ')');
  end if;
  return NEW;
exception when others then return NEW;
end $$;
REVOKE ALL ON FUNCTION public.tg_on_insert() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS tg_orders_insert ON public.orders;
CREATE TRIGGER tg_orders_insert AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_on_insert();
DROP TRIGGER IF EXISTS tg_deposits_insert ON public.deposits;
CREATE TRIGGER tg_deposits_insert AFTER INSERT ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.tg_on_insert();
DROP TRIGGER IF EXISTS tg_profiles_insert ON public.profiles;
CREATE TRIGGER tg_profiles_insert AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_on_insert();

CREATE OR REPLACE FUNCTION public.tg_recent_results()
RETURNS TABLE(id bigint, event text, created_at timestamptz, status_code integer, error text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  select l.id, l.event, l.created_at, r.status_code, coalesce(r.error_msg, case when r.status_code >= 400 then left(r.content, 200) end)
  from telegram_log l left join net._http_response r on r.id = l.request_id
  order by l.id desc limit 20
$$;
REVOKE ALL ON FUNCTION public.tg_recent_results() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_recent_results() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  _pid text; _uname text; _base text; _name text; _set site_settings; _dom text;
begin
  select * into _set from public.site_settings where id=1;
  if _set.id is not null then
    if not _set.allow_signups then raise exception 'SIGNUPS_CLOSED'; end if;
    _dom := lower(split_part(coalesce(new.email,''),'@',2));
    if _dom <> '' and _dom = any (string_to_array(regexp_replace(lower(_set.blocked_email_domains), '[\s,;]+', ',', 'g'), ',')) then
      raise exception 'EMAIL_DOMAIN_BLOCKED';
    end if;
  end if;
  _name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'user');
  loop
    _pid := lpad((floor(random()*90000000)+10000000)::bigint::text, 8, '0');
    exit when not exists (select 1 from public.profiles where public_id=_pid);
  end loop;
  _base := lower(regexp_replace(split_part(_name,' ',1), '[^a-zA-Z0-9]', '', 'g'));
  if _base = '' then _base := 'user'; end if;
  loop
    _uname := left(_base,16) || '_' || (floor(random()*9000)+1000)::int::text;
    exit when not exists (select 1 from public.profiles where username=_uname);
  end loop;
  insert into public.profiles (id, public_id, username, full_name, email, phone, accepted_terms_at)
  values (new.id, _pid, _uname, _name, new.email, nullif(new.raw_user_meta_data->>'phone',''),
    case when new.raw_user_meta_data ? 'accepted_terms' then now() else null end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $function$;

INSERT INTO public.qna (id, question, answer, sort) VALUES
 ('00000000-0000-4000-8000-000000000a01', '{"en":"How long does delivery take?"}', '{"en":"Each service shows its average time. Our team delivers every order manually."}', 1),
 ('00000000-0000-4000-8000-000000000a02', '{"en":"How do I add funds?"}', '{"en":"Open Add Funds, choose Binance, USDT or P2P (bKash, Nagad, Rocket), send the payment and submit the Transaction ID. An admin approves it shortly."}', 2),
 ('00000000-0000-4000-8000-000000000a03', '{"en":"Can I cancel an order?"}', '{"en":"Yes — while the order is still Pending you can cancel it from Order History and get a full refund."}', 3),
 ('00000000-0000-4000-8000-000000000a04', '{"en":"My account is private, what now?"}', '{"en":"Make the profile or post public before ordering, otherwise delivery may fail."}', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pages (slug, title, content) VALUES
 ('policy', '{"en":"Policy"}', '{"en":"By using this store you agree to provide valid public links. We are not responsible for drops caused by platform updates or private accounts."}'),
 ('terms', '{"en":"Terms of Service"}', '{"en":"By using this store you agree to provide valid public links. We are not responsible for drops caused by platform updates or private accounts."}'),
 ('privacy', '{"en":"Privacy Policy"}', '{"en":"We store only the data needed to run your account: name, email, phone, orders and payments. We never sell your data."}'),
 ('refund', '{"en":"Refund & Delivery Policy"}', '{"en":"Rejected or canceled orders are refunded in full to your wallet balance instantly. Partially delivered orders are refunded for the undelivered amount. Wallet funds are not withdrawable as cash."}'),
 ('about', '{"en":"About Us"}', '{"en":"We are a small team that hand-delivers social growth for Facebook, Instagram, YouTube, TikTok and Telegram."}'),
 ('api-policy', '{"en":"API Policy"}', '{"en":"Orders placed through the API are charged from your balance and delivered manually. Do not share your API key."}')
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.qna; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pages; EXCEPTION WHEN others THEN NULL; END;
END $$;