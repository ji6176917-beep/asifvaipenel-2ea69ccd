-- Transaction-only integration check: no orders, deposits, alerts or balance changes persist.
BEGIN;
DO $$
DECLARE
  o public.orders;
  d public.deposits;
  n integer;
BEGIN
  SELECT * INTO o FROM public.orders LIMIT 1;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order fixture required'; END IF;
  o.id := gen_random_uuid();
  o.order_code := 'test-' || o.id::text;
  o.idempotency_key := gen_random_uuid()::text;
  INSERT INTO public.orders SELECT o.*;
  INSERT INTO public.orders SELECT o.* ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO n FROM public.notifications
    WHERE user_id=o.user_id AND title='Order #' || o.order_code || ' is now pending';
  IF n <> 1 THEN RAISE EXCEPTION 'Expected exactly one order submission notification, got %', n; END IF;

  SELECT * INTO d FROM public.deposits LIMIT 1;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Deposit fixture required'; END IF;
  d.id := gen_random_uuid();
  d.code := 'test-' || d.id::text;
  d.idempotency_key := gen_random_uuid()::text;
  d.txn_id := 'test-' || d.id::text;
  INSERT INTO public.deposits SELECT d.*;
  INSERT INTO public.deposits SELECT d.* ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO n FROM public.notifications
    WHERE user_id=d.user_id AND title='Add Fund #' || d.code || ' is now pending' AND body='';
  IF n <> 1 THEN RAISE EXCEPTION 'Expected exactly one deposit submission notification, got %', n; END IF;
END;
$$;
ROLLBACK;