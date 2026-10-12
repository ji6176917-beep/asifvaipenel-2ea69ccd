CREATE SEQUENCE IF NOT EXISTS public.services_service_no_seq START 1;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_no integer;
WITH o AS (SELECT id, row_number() OVER (ORDER BY sort, name, id) AS n FROM public.services WHERE service_no IS NULL)
UPDATE public.services s SET service_no = o.n FROM o WHERE s.id = o.id;
SELECT setval('public.services_service_no_seq', GREATEST(COALESCE((SELECT max(service_no) FROM public.services), 0), 1));
ALTER TABLE public.services ALTER COLUMN service_no SET DEFAULT nextval('public.services_service_no_seq');
ALTER SEQUENCE public.services_service_no_seq OWNED BY public.services.service_no;
CREATE UNIQUE INDEX IF NOT EXISTS services_service_no_key ON public.services(service_no);
GRANT USAGE, SELECT ON SEQUENCE public.services_service_no_seq TO service_role;