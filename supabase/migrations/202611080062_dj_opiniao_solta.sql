-- Opinião solta no DJ Index: quem tem conta confirmada e nick pode deixar uma opinião sobre qualquer DJ do índice,
-- mesmo que o DJ não tenha tocado em festa cadastrada. Uma por pessoa e DJ (salvar de novo edita). Não dá giros nem entra na nota.
-- A seção "Opinião da pista" passa a mostrar as resenhas de festa e as opiniões soltas juntas.
begin;

create table brb_private.dj_opinions(
 user_id uuid not null references auth.users(id) on delete cascade,
 dj text not null check(length(btrim(dj)) between 1 and 80),
 text text not null check(length(btrim(text)) between 3 and 500),
 hidden boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,dj)
);
alter table brb_private.dj_opinions enable row level security;
revoke all on brb_private.dj_opinions from public,anon,authenticated;

create or replace function public.brb_dj_opinion(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d text:=btrim(coalesce(payload->>'dj','')); t text:=btrim(coalesce(payload->>'text','')); res jsonb;
begin
 if u is null then raise exception 'Entre na sua conta para deixar sua opinião.';end if;
 if not exists(select 1 from auth.users x where x.id=u and x.email_confirmed_at is not null) then raise exception 'Confirme seu e-mail para deixar sua opinião.';end if;
 if length(d) not between 1 and 80 then raise exception 'DJ inválido.';end if;
 if action='mine' then
  select jsonb_build_object('text',o.text) into res from brb_private.dj_opinions o where o.user_id=u and o.dj=d and not o.hidden;
  return coalesce(res,'{}'::jsonb);
 end if;
 if action='remove' then
  delete from brb_private.dj_opinions where user_id=u and dj=d and not hidden;
  return jsonb_build_object('ok',true);
 end if;
 if action='save' then
  if not exists(select 1 from brb_private.profiles p where p.user_id=u) then raise exception 'Escolha seu nickname no perfil antes de opinar.';end if;
  if length(t) not between 3 and 500 then raise exception 'A opinião precisa ter de 3 a 500 caracteres.';end if;
  if exists(select 1 from brb_private.dj_opinions o where o.user_id=u and o.hidden and o.dj=d) then raise exception 'Sua opinião sobre este DJ foi ocultada pela moderação.';end if;
  if (select count(*) from brb_private.dj_opinions o where o.user_id=u and o.updated_at>now()-interval '1 hour')>=10 then raise exception 'Muitas opiniões em pouco tempo. Tente de novo mais tarde.';end if;
  insert into brb_private.dj_opinions(user_id,dj,text) values(u,d,t)
   on conflict(user_id,dj) do update set text=excluded.text,updated_at=now();
  return jsonb_build_object('ok',true);
 end if;
 if action='hide' or action='unhide' then
  if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
  update brb_private.dj_opinions set hidden=(action='hide') where user_id=nullif(payload->>'user_id','')::uuid and dj=d;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
end;
$$;
revoke all on function public.brb_dj_opinion(text,jsonb) from public,anon;
grant execute on function public.brb_dj_opinion(text,jsonb) to authenticated;

create or replace function public.brb_reviews(dj_name text) returns jsonb
language sql stable security definer set search_path='' as $$
 with valid as (
  select s.identity,s.payload,s.created_at
  from brb_private.submissions s join auth.users u on u.id::text=s.identity
  where s.kind='vote' and s.status='approved' and s.payload->>'dj'=dj_name and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
  and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'))
 ), latest as (
  select distinct on (identity) identity,payload,created_at from valid order by identity,created_at desc
 ), festa as (
  select jsonb_build_object(
   'nick',l.payload->>'nick','text',btrim(l.payload->>'comment'),'at',l.created_at,
   'nota',round(((l.payload->'notas'->>'som')::numeric+(l.payload->'notas'->>'harmonia')::numeric+(l.payload->'notas'->>'energia')::numeric+(l.payload->'notas'->>'sofisticacao')::numeric)/4,1),
   'festa',(select e.title||' · '||to_char(e.event_date,'DD/MM/YYYY') from brb_private.event_catalog e where e.id=l.payload->>'party')
  ) item,l.created_at at
  from latest l where length(btrim(coalesce(l.payload->>'comment','')))>0
 ), solta as (
  select jsonb_build_object('nick',p.nick,'text',btrim(o.text),'at',o.updated_at,'nota',null,'festa',null) item,o.updated_at at
  from brb_private.dj_opinions o
  join auth.users u on u.id=o.user_id and u.email_confirmed_at is not null
  join brb_private.profiles p on p.user_id=o.user_id
  where o.dj=dj_name and not o.hidden
 ), todas as (
  select * from festa union all select * from solta order by at desc limit 50
 )
 select coalesce(jsonb_agg(item order by at desc),'[]'::jsonb) from todas;
$$;
revoke all on function public.brb_reviews(text) from public;
grant execute on function public.brb_reviews(text) to anon,authenticated;

commit;
