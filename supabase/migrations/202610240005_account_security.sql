-- Private authentication throttling, enforced by the Auth password hook.
create table brb_private.password_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 failures integer not null default 0,
 window_start timestamptz not null default now(),
 blocked_until timestamptz
);
alter table brb_private.password_attempts enable row level security;
revoke all on brb_private.password_attempts from public,anon,authenticated;
create function brb_private.password_guard(event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid := (event->>'user_id')::uuid; state brb_private.password_attempts%rowtype;
begin
 -- Other applications share this Auth service. Guard only BRB accounts.
 if not exists(select 1 from auth.users where id=uid and raw_user_meta_data->>'brb_app'='true')
 and not exists(select 1 from brb_private.profiles where user_id=uid) then
  return jsonb_build_object('decision','continue');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('brb-password:'||uid::text,0));
 select * into state from brb_private.password_attempts where user_id=uid;
 if state.blocked_until>now() then
  return jsonb_build_object('decision','reject','message','Muitas tentativas. Aguarde 15 minutos.','should_logout_user',false);
 end if;
 if event->'valid'='true'::jsonb then
  delete from brb_private.password_attempts where user_id=uid;
  return jsonb_build_object('decision','continue');
 end if;
 if state.window_start is null or state.window_start<now()-interval '15 minutes' then
  insert into brb_private.password_attempts(user_id,failures,window_start) values(uid,1,now())
  on conflict(user_id) do update set failures=1,window_start=now(),blocked_until=null;
 else
  update brb_private.password_attempts set failures=failures+1,
   blocked_until=case when failures+1>=5 then now()+interval '15 minutes' else null end where user_id=uid;
 end if;
 return jsonb_build_object('decision','continue');
end $$;
revoke all on function brb_private.password_guard(jsonb) from public,anon,authenticated;
grant usage on schema brb_private to supabase_auth_admin;
grant execute on function brb_private.password_guard(jsonb) to supabase_auth_admin;

-- Move implementation behind a guarded public entry point. A verified factor
-- cannot be bypassed by calling the RPC directly with a password-only session.
alter function public.brb_action(text,jsonb) set schema brb_private;
alter function brb_private.brb_action(text,jsonb) rename to action_core;
revoke all on function brb_private.action_core(text,jsonb) from public,anon,authenticated;
create function public.brb_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and action not in ('feed','vote','application','waitlist')
 and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
 and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
  raise exception 'Verifique o código de dois fatores na sua conta.';
 end if;
 return brb_private.action_core(action,payload);
end $$;
revoke all on function public.brb_action(text,jsonb) from public;
grant execute on function public.brb_action(text,jsonb) to anon,authenticated;
