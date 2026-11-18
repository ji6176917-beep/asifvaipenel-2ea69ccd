ALTER TABLE public.service_providers ALTER COLUMN markup SET DEFAULT 10;
CREATE OR REPLACE FUNCTION public.apply_service_price_rule()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE _markup numeric;
BEGIN
  IF NEW.provider_id IS NULL OR NEW.provider_rate IS NULL OR NEW.provider_rate <= 0 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.price_mode IS NOT DISTINCT FROM OLD.price_mode AND NEW.price_value IS NOT DISTINCT FROM OLD.price_value AND NEW.provider_rate IS NOT DISTINCT FROM OLD.provider_rate AND NEW.rate IS DISTINCT FROM OLD.rate AND NEW.custom_rate THEN
    NEW.price_mode := 'fixed';
    NEW.price_value := NEW.rate - NEW.provider_rate;
  END IF;
  IF NEW.price_mode IS NULL AND NEW.custom_rate THEN
    IF TG_OP = 'UPDATE' AND OLD.custom_rate AND OLD.provider_rate > 0 THEN
      NEW.price_mode := 'percent';
      NEW.price_value := (OLD.rate / OLD.provider_rate - 1) * 100;
    ELSE
      NEW.price_mode := 'percent';
      NEW.price_value := (NEW.rate / NEW.provider_rate - 1) * 100;
    END IF;
  END IF;
  IF NEW.price_mode IS NOT NULL THEN
    NEW.rate := greatest(0.0001, ceil(CASE NEW.price_mode WHEN 'percent' THEN NEW.provider_rate * (1 + NEW.price_value / 100) WHEN 'fixed' THEN NEW.provider_rate + NEW.price_value ELSE NEW.provider_rate END * 10000) / 10000);
    NEW.custom_rate := true;
  ELSE
    SELECT markup INTO _markup FROM public.service_providers WHERE id = NEW.provider_id;
    NEW.rate := greatest(0.0001, ceil(NEW.provider_rate * (1 + coalesce(_markup,10) / 100) * 10000) / 10000);
    NEW.custom_rate := false;
  END IF;
  RETURN NEW;
END $function$;
CREATE OR REPLACE FUNCTION public.set_provider_markup(_provider uuid, _markup numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF _markup IS NULL OR _markup < 0 OR _markup > 10000 THEN RAISE EXCEPTION 'INVALID_MARKUP'; END IF;
  UPDATE public.service_providers SET markup = _markup WHERE id = _provider;
  UPDATE public.services SET provider_rate = provider_rate WHERE provider_id = _provider AND deleted_at IS NULL AND price_mode IS NULL AND NOT custom_rate;
  UPDATE public.site_settings SET content_version = content_version + 1 WHERE id = 1;
END $function$;