DROP POLICY IF EXISTS "public settings" ON public.site_settings;
CREATE POLICY "public settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (id = 1);