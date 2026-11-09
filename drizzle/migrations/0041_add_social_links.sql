ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS social_facebook text NOT NULL DEFAULT 'https://www.facebook.com/share/1NLNd912Fg/',
  ADD COLUMN IF NOT EXISTS social_youtube text NOT NULL DEFAULT 'https://youtube.com/@apexsmmworld',
  ADD COLUMN IF NOT EXISTS social_tiktok text NOT NULL DEFAULT 'https://tiktok.com/@apexsmmworld';