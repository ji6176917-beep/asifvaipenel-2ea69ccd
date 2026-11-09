INSERT INTO public.menu_items (location, system_key, label, icon_key, target_type, target_value, sort, requires_login, is_active, is_system)
SELECT 'footer_links', 'refund', '{"en":"Refund Policy"}'::jsonb, 'shield', 'internal_route', '/p/refund', 6, false, true, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE location = 'footer_links' AND system_key = 'refund' AND deleted_at IS NULL
);