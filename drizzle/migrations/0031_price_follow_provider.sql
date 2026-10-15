ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_mode text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.services ADD CONSTRAINT services_price_mode_chk CHECK (price_mode IS NULL OR price_mode IN ('base','percent','fixed'));
CREATE OR REPLACE FUNCTION public.apply_service_price_rule()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.price_mode IS NOT NULL AND NEW.provider_rate IS NOT NULL THEN
    NEW.rate := greatest(0.0001, ceil(CASE NEW.price_mode
      WHEN 'percent' THEN NEW.provider_rate * (1 + NEW.price_value / 100)
      WHEN 'fixed' THEN NEW.provider_rate + NEW.price_value
      ELSE NEW.provider_rate END * 10000) / 10000);
    NEW.custom_rate := true;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER services_price_rule BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.apply_service_price_rule();