CREATE OR REPLACE FUNCTION public.guard_provider_placeholder_price() RETURNS trigger LANGUAGE plpgsql SET search_path TO public AS $function$
BEGIN
 IF NEW.provider_id IS NOT NULL AND NEW.provider_rate >= 90000000 AND NEW.price_mode IS NULL AND NOT NEW.custom_rate THEN
  NEW.active:=false; NEW.provider_order_supported:=false; NEW.price_mode:='base'; NEW.price_value:=0;
 END IF;
 RETURN NEW;
END $function$;
CREATE TRIGGER services_placeholder_price BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.guard_provider_placeholder_price();