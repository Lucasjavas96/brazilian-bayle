-- Número de resenhas por DJ (mesmas regras de public.brb_reviews: comentários de avaliações válidas + opiniões soltas visíveis), no máximo 50 por DJ como na lista.
begin;
create or replace function public.brb_review_counts() returns jsonb
language sql stable security definer set search_path='' as $$
 with valid as (
  select s.identity,s.payload->>'dj' dj,s.payload,s.created_at
  from brb_private.submissions s join auth.users u on u.id::text=s.identity
  where s.kind='vote' and s.status='approved' and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
   and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'))
 ), latest as (
  select distinct on (identity,dj) dj,payload from valid order by identity,dj,created_at desc
 ), allr as (
  select dj from latest where length(btrim(coalesce(payload->>'comment','')))>0
  union all
  select o.dj from brb_private.dj_opinions o
   join auth.users u on u.id=o.user_id and u.email_confirmed_at is not null
   join brb_private.profiles p on p.user_id=o.user_id
   where not o.hidden
 )
 select coalesce(jsonb_object_agg(t.dj,t.n),'{}'::jsonb) from (select dj,least(count(*),50)::integer n from allr group by dj) t;
$$;
revoke all on function public.brb_review_counts() from public;
grant execute on function public.brb_review_counts() to anon,authenticated;
commit;
