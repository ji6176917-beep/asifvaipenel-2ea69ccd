CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;
DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.place_order(uuid,text,integer,text)','public.api_place_order(uuid,uuid,text,integer)'] LOOP
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, $r$lpad((floor(random()*9000000000)+1000000000)::bigint::text,10,'0')$r$, $r$nextval('public.order_number_seq')::text$r$);
    IF position('order_number_seq' in d) = 0 THEN RAISE EXCEPTION 'pattern not found in %', f; END IF;
    EXECUTE d;
  END LOOP;
END $$;