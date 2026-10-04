ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS last_backup_at timestamptz;
CREATE OR REPLACE FUNCTION public.admin_reconcile_balances()
RETURNS TABLE(user_id uuid, username text, balance numeric, ledger_sum numeric, diff numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select p.id, p.username, p.balance, coalesce(l.s,0), p.balance - coalesce(l.s,0)
  from profiles p left join (select user_id, sum(amount) s from wallet_ledger group by user_id) l on l.user_id = p.id
  where p.balance <> coalesce(l.s,0)
$$;
REVOKE ALL ON FUNCTION public.admin_reconcile_balances() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_balances() TO service_role;
CREATE OR REPLACE FUNCTION public.admin_storage_usage()
RETURNS TABLE(bucket text, files bigint, bytes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  select bucket_id, count(*), coalesce(sum((metadata->>'size')::bigint),0) from storage.objects group by bucket_id
$$;
REVOKE ALL ON FUNCTION public.admin_storage_usage() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_storage_usage() TO service_role;