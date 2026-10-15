CREATE OR REPLACE FUNCTION public.sync_provider_catalog(_provider uuid, _rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p public.service_providers; _r jsonb; _platform uuid; _cat uuid; _slug text; _name text; _count integer:=0;
BEGIN
  SELECT * INTO _p FROM public.service_providers WHERE id=_provider AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  UPDATE public.services SET provider_available=false WHERE provider_id=_provider;
  FOR _r IN SELECT value FROM jsonb_array_elements(_rows) LOOP
    _slug:=coalesce(nullif(_r->>'platform',''),'other');
    SELECT id INTO _platform FROM public.platforms WHERE slug=_slug ORDER BY (deleted_at IS NULL) DESC LIMIT 1;
    IF _platform IS NULL THEN
      INSERT INTO public.platforms(slug,name,active,sort) VALUES(_slug,coalesce(nullif(_r->>'platform_name',''),initcap(_slug)),true,100) RETURNING id INTO _platform;
    END IF;
    SELECT id INTO _cat FROM public.categories WHERE platform_id=_platform AND name=_r->>'category' AND deleted_at IS NULL ORDER BY sort LIMIT 1;
    IF _cat IS NULL THEN INSERT INTO public.categories(platform_id,name,active) VALUES(_platform,_r->>'category',true) RETURNING id INTO _cat; END IF;
    _name:=left(_r->>'name',200);
    IF EXISTS(SELECT 1 FROM public.services WHERE category_id=_cat AND name=_name AND (provider_id IS DISTINCT FROM _provider OR provider_service_id IS DISTINCT FROM _r->>'service')) THEN
      _name:=left(_r->>'name',185)||' #'||(_r->>'service');
    END IF;
    INSERT INTO public.services(category_id,name,rate,rate_per,min_qty,max_qty,provider_id,provider_service_id,provider_rate,provider_available,provider_type,provider_order_supported,active)
    VALUES(_cat,_name,ceil((_r->>'rate')::numeric*(1+_p.markup/100)*10000)/10000,1000,(_r->>'min')::integer,(_r->>'max')::integer,_provider,_r->>'service',(_r->>'rate')::numeric,coalesce((_r->>'available')::boolean,true),_r->>'type',lower(_r->>'type')='default',true)
    ON CONFLICT(provider_id,provider_service_id) WHERE provider_id IS NOT NULL DO UPDATE SET category_id=EXCLUDED.category_id,name=CASE WHEN services.custom_name THEN services.name ELSE EXCLUDED.name END,rate=CASE WHEN services.custom_rate THEN services.rate ELSE EXCLUDED.rate END,provider_rate=EXCLUDED.provider_rate,min_qty=EXCLUDED.min_qty,max_qty=EXCLUDED.max_qty,provider_available=EXCLUDED.provider_available,provider_type=EXCLUDED.provider_type,provider_order_supported=EXCLUDED.provider_order_supported;
    _count:=_count+1;
  END LOOP;
  UPDATE public.service_providers SET last_synced_at=now() WHERE id=_provider;
  UPDATE public.site_settings SET content_version=content_version+1 WHERE id=1;
  RETURN _count;
END $$;