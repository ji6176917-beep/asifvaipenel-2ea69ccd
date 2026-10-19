ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS catalog_sync boolean NOT NULL DEFAULT true;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS comments_template text;