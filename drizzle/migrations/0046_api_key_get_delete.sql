create or replace function public.get_my_api_key() returns text language sql stable security definer set search_path to 'public' as $$ select api_key from profiles where id = auth.uid() $$;
create or replace function public.delete_my_api_key() returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update profiles set api_key = null, api_key_hash = null where id = auth.uid();
end $$;
revoke all on function public.get_my_api_key() from public, anon;
revoke all on function public.delete_my_api_key() from public, anon;
grant execute on function public.get_my_api_key() to authenticated;
grant execute on function public.delete_my_api_key() to authenticated;