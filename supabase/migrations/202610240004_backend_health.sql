begin;
create or replace function public.brb_backend_health() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('service','brazilian-bayle','schema_version','202610240004','ok',true);
$$;
revoke all on function public.brb_backend_health() from public;
grant execute on function public.brb_backend_health() to anon,authenticated;
commit;
