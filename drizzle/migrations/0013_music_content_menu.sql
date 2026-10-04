ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS volume integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS loop boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS autoplay boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_for text NOT NULL DEFAULT 'all';

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS music_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS share_image_url text,
  ADD COLUMN IF NOT EXISTS footer_copyright text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_start timestamptz,
  ADD COLUMN IF NOT EXISTS announcement_end timestamptz,
  ADD COLUMN IF NOT EXISTS popup_on boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_image text,
  ADD COLUMN IF NOT EXISTS popup_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS popup_mode text NOT NULL DEFAULT 'once';

CREATE TABLE IF NOT EXISTS public.ui_labels (
  key text PRIMARY KEY,
  page_group text NOT NULL,
  default_text text NOT NULL DEFAULT '',
  translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  rich boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ui_labels TO anon, authenticated;
GRANT ALL ON public.ui_labels TO service_role;
ALTER TABLE public.ui_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public labels" ON public.ui_labels FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.ui_icons (
  key text PRIMARY KEY,
  page_group text NOT NULL,
  icon_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ui_icons TO anon, authenticated;
GRANT ALL ON public.ui_icons TO service_role;
ALTER TABLE public.ui_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public icons" ON public.ui_icons FOR SELECT TO anon, authenticated USING (true);

DO $$ BEGIN
  CREATE TYPE public.menu_location AS ENUM ('three_dot_menu','bottom_bar','footer_links','footer_info','home_shortcuts');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE public.menu_target AS ENUM ('internal_route','external_url','telegram','whatsapp','email','action');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location public.menu_location NOT NULL,
  label jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_key text,
  icon_url text,
  target_type public.menu_target NOT NULL DEFAULT 'internal_route',
  target_value text NOT NULL DEFAULT '/',
  sort integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  requires_login boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  system_key text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location, system_key)
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public menu" ON public.menu_items FOR SELECT TO anon, authenticated USING (is_active AND deleted_at IS NULL);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ui_labels, public.ui_icons, public.menu_items, public.site_settings;
EXCEPTION WHEN others THEN null; END $$;