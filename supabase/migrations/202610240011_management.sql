begin;
create table brb_private.staff(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table brb_private.staff enable row level security;
revoke all on brb_private.staff from public,anon,authenticated;
create table brb_private.management_log(id bigint generated always as identity primary key,actor uuid references auth.users(id),action text not null,target text not null,created_at timestamptz not null default now());
alter table brb_private.management_log enable row level security;
revoke all on brb_private.management_log from public,anon,authenticated;
create function public.brb_manage(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;changed integer;
begin
 if u is null or not exists(select 1 from brb_private.staff where user_id=u) then raise exception 'Acesso restrito à equipe.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Confirme seu acesso na página da conta.';end if;
 if action='list' then
  select jsonb_build_object(
   'submissions',coalesce((select jsonb_agg(to_jsonb(s)) from(select id,kind,payload,status,created_at from brb_private.submissions order by created_at desc limit 100)s),'[]'::jsonb),
   'posts',coalesce((select jsonb_agg(to_jsonb(p)) from(select p.id,p.title,p.body,p.status,p.created_at,(select count(*) from brb_private.reports r where r.post_id=p.id) reports from brb_private.posts p where p.is_demo=false order by (select count(*) from brb_private.reports r where r.post_id=p.id) desc,p.created_at desc limit 100)p),'[]'::jsonb),
   'support',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,name,email,topic,message,status,created_at from brb_private.support_tickets order by created_at desc limit 100)t),'[]'::jsonb)
  ) into result;return result;
 elsif action='submission_status' then
  if payload->>'status' not in ('approved','rejected','pending') then raise exception 'Status inválido.';end if;
  update brb_private.submissions set status=payload->>'status' where id=(payload->>'id')::uuid;
  get diagnostics changed=row_count;
 elsif action='post_status' then
  if payload->>'status' not in ('published','review','hidden') then raise exception 'Status inválido.';end if;
  update brb_private.posts set status=payload->>'status' where id=payload->>'id' and is_demo=false;
  get diagnostics changed=row_count;
 else raise exception 'Ação inválida.';
 end if;
 if changed<>1 then raise exception 'Registro não encontrado.';end if;
 insert into brb_private.management_log(actor,action,target) values(u,action||':'||(payload->>'status'),payload->>'id');
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_manage(text,jsonb) from public;
grant execute on function public.brb_manage(text,jsonb) to authenticated;
commit;
