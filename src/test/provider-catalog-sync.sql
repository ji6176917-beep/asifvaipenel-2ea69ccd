BEGIN;
DO $$
DECLARE p uuid; s uuid; r numeric; available boolean; n integer;
BEGIN
  INSERT INTO public.service_providers(name,api_url,api_key,markup) VALUES('Transactional sync test','https://example.com/api/v2','test-only',20) RETURNING id INTO p;
  PERFORM public.sync_provider_catalog(p,'[{"service":"1","name":"Test likes","category":"Test","platform":"facebook","platform_name":"Facebook","type":"Default","rate":10,"min":1,"max":100,"available":true},{"service":"2","name":"Comments","category":"Test","platform":"facebook","platform_name":"Facebook","type":"Custom Comments","rate":2,"min":1,"max":100,"available":true}]'::jsonb);
  SELECT count(*) INTO n FROM public.services WHERE provider_id=p;
  IF n<>2 THEN RAISE EXCEPTION 'All service types must import'; END IF;
  IF EXISTS(SELECT 1 FROM public.services WHERE provider_id=p AND active) THEN RAISE EXCEPTION 'Imported services must start OFF'; END IF;
  PERFORM public.sync_provider_catalog(p,'[{"service":"9","name":"X","category":"T","platform":"other","platform_name":"Other","type":"Default","rate":1,"min":1,"max":10,"available":true}]'::jsonb);
  IF EXISTS(SELECT 1 FROM public.services WHERE provider_id=p AND provider_service_id='9') THEN RAISE EXCEPTION 'Only five platforms import'; END IF;
  SELECT id,rate INTO s,r FROM public.services WHERE provider_id=p AND provider_service_id='1';
  IF r<>12 THEN RAISE EXCEPTION '20 percent markup must produce 12'; END IF;
  PERFORM public.sync_provider_catalog(p,'[{"service":"1","name":"Test likes","category":"Test","platform":"facebook","platform_name":"Facebook","type":"Default","rate":20,"min":1,"max":100,"available":true}]'::jsonb);
  SELECT rate INTO r FROM public.services WHERE id=s;
  IF r<>24 THEN RAISE EXCEPTION 'Upstream price change must apply markup'; END IF;
  SELECT provider_available INTO available FROM public.services WHERE provider_id=p AND provider_service_id='2';
  IF available THEN RAISE EXCEPTION 'Removed upstream service must close'; END IF;
  UPDATE public.services SET rate=30,custom_rate=true WHERE id=s;
  PERFORM public.sync_provider_catalog(p,'[{"service":"1","name":"Test likes","category":"Test","platform":"facebook","platform_name":"Facebook","type":"Default","rate":25,"min":1,"max":100,"available":false}]'::jsonb);
  SELECT rate,provider_available INTO r,available FROM public.services WHERE id=s;
  IF r<>30 THEN RAISE EXCEPTION 'Explicit custom price must persist'; END IF;
  IF available THEN RAISE EXCEPTION 'Upstream disabled service must close'; END IF;
END $$;
ROLLBACK;