-- Ver resenhas: devolve os comentários públicos das avaliações válidas de um DJ (a mais recente de cada pessoa), com o @ de quem escreveu.
-- Mesmas regras do ranking: conta confirmada, festa já realizada e DJ no line-up. Só leitura.
begin;
create or replace function public.brb_reviews(dj_name text) returns jsonb
language sql stable security definer set search_path='' as $$
 with valid as (
  select s.identity,s.payload,s.created_at
  from brb_private.submissions s join auth.users u on u.id::text=s.identity
  where s.kind='vote' and s.status='approved' and s.payload->>'dj'=dj_name and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
  and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'))
 ), latest as (
  select distinct on (identity) identity,payload,created_at from valid order by identity,created_at desc
 ), shown as (
  select * from latest where length(btrim(coalesce(payload->>'comment','')))>0 order by created_at desc limit 50
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'nick',l.payload->>'nick','text',btrim(l.payload->>'comment'),'at',l.created_at,
  'nota',round(((l.payload->'notas'->>'som')::numeric+(l.payload->'notas'->>'harmonia')::numeric+(l.payload->'notas'->>'energia')::numeric+(l.payload->'notas'->>'sofisticacao')::numeric)/4,1),
  'festa',(select e.title||' · '||to_char(e.event_date,'DD/MM/YYYY') from brb_private.event_catalog e where e.id=l.payload->>'party')
 ) order by l.created_at desc),'[]'::jsonb) from shown l;
$$;
revoke all on function public.brb_reviews(text) from public;
grant execute on function public.brb_reviews(text) to anon,authenticated;
commit;
