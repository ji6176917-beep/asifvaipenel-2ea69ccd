BEGIN;
DO $$
DECLARE p uuid; s uuid; r numeric;
BEGIN
  INSERT INTO public.service_providers(name,api_url,api_key,active,catalog_sync) VALUES('Profit regression test','https://example.com/api/v2','test-only',false,false) RETURNING id INTO p;
  INSERT INTO public.services(category_id,name,rate,provider_id,provider_service_id,provider_rate,min_qty,max_qty)
  SELECT id,'Profit test',10,p,'1',10,1,100 FROM public.categories WHERE deleted_at IS NULL LIMIT 1;
  SELECT id,rate INTO s,r FROM public.services WHERE provider_id=p AND provider_service_id='1';
  IF r IS DISTINCT FROM 11 THEN RAISE EXCEPTION 'New API service must add 10 percent: %',r; END IF;
  UPDATE public.services SET price_mode='percent',price_value=20 WHERE id=s;
  UPDATE public.services SET provider_rate=20 WHERE id=s;
  SELECT rate INTO r FROM public.services WHERE id=s;
  IF r IS DISTINCT FROM 24 THEN RAISE EXCEPTION 'Custom 20 percent must follow updated cost: %',r; END IF;
  UPDATE public.services SET price_mode='fixed',price_value=3 WHERE id=s;
  UPDATE public.services SET provider_rate=25 WHERE id=s;
  SELECT rate INTO r FROM public.services WHERE id=s;
  IF r IS DISTINCT FROM 28 THEN RAISE EXCEPTION 'Custom fixed addition must remain 3: %',r; END IF;
  UPDATE public.service_providers SET markup=10 WHERE id=p;
  UPDATE public.services SET provider_rate=provider_rate WHERE id=s AND price_mode IS NULL AND NOT custom_rate;
  SELECT rate INTO r FROM public.services WHERE id=s;
  IF r IS DISTINCT FROM 28 THEN RAISE EXCEPTION 'Provider default must not overwrite custom profit: %',r; END IF;
  UPDATE public.services SET price_mode=NULL,price_value=0,custom_rate=false WHERE id=s;
  UPDATE public.services SET provider_rate=30 WHERE id=s;
  SELECT rate INTO r FROM public.services WHERE id=s;
  IF r IS DISTINCT FROM 33 THEN RAISE EXCEPTION 'Default profit must follow future cost: %',r; END IF;
END $$;
ROLLBACK;