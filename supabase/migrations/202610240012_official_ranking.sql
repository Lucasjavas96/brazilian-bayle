begin;
create function public.brb_ranking() returns jsonb
language sql stable security definer set search_path='' as $$
 with eligible as (
 select s.identity,s.payload,s.created_at,row_number() over(partition by s.identity,s.payload->>'party',s.payload->>'dj' order by s.created_at) duplicate_order
 from brb_private.submissions s join auth.users u on u.id::text=s.identity
 where s.kind='vote' and s.status='approved' and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
 and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'))
 ), averages as (
 select payload->>'dj' name,count(*) votos,count(distinct payload->>'party') festas,
 avg((payload->'notas'->>'som')::numeric) som,avg((payload->'notas'->>'harmonia')::numeric) harmonia,
 avg((payload->'notas'->>'energia')::numeric) energia,avg((payload->'notas'->>'sofisticacao')::numeric) sofisticacao
 from eligible where duplicate_order=1 group by payload->>'dj'
 ), ranked as (
 select *, (som+harmonia+energia+sofisticacao)/4 nota,rank() over(order by (som+harmonia+energia+sofisticacao)/4 desc) pos from averages
 ) select coalesce(jsonb_agg(to_jsonb(r) order by nota desc,name),'[]'::jsonb) from ranked r;
$$;
revoke all on function public.brb_ranking() from public;
grant execute on function public.brb_ranking() to anon,authenticated;
commit;
