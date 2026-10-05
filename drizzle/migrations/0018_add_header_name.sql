ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS header_name text;
UPDATE public.site_settings SET header_name = 'Apex SMM World' WHERE id = 1 AND header_name IS NULL;