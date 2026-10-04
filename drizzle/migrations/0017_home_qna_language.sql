ALTER TABLE public.qna ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;
ALTER TABLE public.qna ADD COLUMN IF NOT EXISTS home_sort integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.set_my_language(_lang text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF _lang NOT IN ('en','bn','hi','pt-BR','id','tr','ar','fa') THEN RAISE EXCEPTION 'BAD_LANG'; END IF;
  UPDATE public.profiles SET language = _lang WHERE id = auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.set_my_language(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_my_language(text) TO authenticated;