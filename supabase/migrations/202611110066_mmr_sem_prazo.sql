-- Ajustes do MMR: sem prazo de encerramento (todo voto vale, em qualquer set e a qualquer tempo) e sem mínimo de votantes (1 voto já mexe no MMR).
-- Parque Villa-Lobos e Arena Open entram no tier A (festas de altíssimo nível, mesmo não sendo clubes).
begin;
update brb_private.mmr_config set min_votes=1 where version=1;
insert into brb_private.clubs(name,tier) values('Parque Villa-Lobos','A'),('Arena Open','A');
insert into brb_private.club_aliases(alias,club_id)
 select a.alias,c.id from (values('parquevillalobos','Parque Villa-Lobos'),('parquevilalobos','Parque Villa-Lobos'),('arenaopen','Arena Open')) a(alias,name)
 join brb_private.clubs c on c.name=a.name;
update brb_private.mmr_state set dirty=true where id;

create or replace function brb_private.mmr_process(p_force boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare c record; st record; r record; calc record; cur_dj text; cur_mmr integer; stat text;
begin
 select * into st from brb_private.mmr_state;
 if not p_force and not st.dirty and st.last_run>now()-interval '5 minutes' then return; end if;
 if not pg_try_advisory_xact_lock(724001) then return; end if;
 select * into c from brb_private.mmr_config where active order by version desc limit 1;
 delete from brb_private.mmr_history where true;
 for r in
  with valid as (
   select s.identity,s.payload->>'dj' dj,s.payload->>'party' party,s.payload->'notas' notas,s.created_at,e.event_date,e.venue
   from brb_private.submissions s
   join auth.users u on u.id::text=s.identity
   join brb_private.event_catalog e on e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj')
   where s.kind='vote' and s.status='approved' and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
    and s.payload->'notas' ?& array['som','harmonia','energia','sofisticacao']
    and (s.payload->'notas'->>'som')::numeric between 0 and 10 and (s.payload->'notas'->>'harmonia')::numeric between 0 and 10
    and (s.payload->'notas'->>'energia')::numeric between 0 and 10 and (s.payload->'notas'->>'sofisticacao')::numeric between 0 and 10
  ), latest as (
   select distinct on (identity,dj,party) identity,dj,party,notas,event_date,venue
   from valid order by identity,dj,party,created_at desc
  ), perf as (
   select dj,party,max(event_date) event_date,max(venue) venue,count(*)::integer n,
    avg((notas->>'som')::numeric) som,avg((notas->>'harmonia')::numeric) harmonia,
    avg((notas->>'energia')::numeric) vibe,avg((notas->>'sofisticacao')::numeric) sofisticacao,
    avg(((notas->>'som')::numeric+(notas->>'harmonia')::numeric+(notas->>'energia')::numeric+(notas->>'sofisticacao')::numeric)/4) media
   from latest group by dj,party
  )
  select p.*,cl.club_id,coalesce(cl.club_name,p.venue) club_name,coalesce(cl.tier,'E') tier
  from perf p
  left join lateral (
   select a.club_id,k.name club_name,k.tier
   from brb_private.club_aliases a join brb_private.clubs k on k.id=a.club_id
   where brb_private.club_norm(p.venue) like a.alias||'%'
   order by length(a.alias) desc limit 1
  ) cl on true
  order by p.dj,p.event_date,p.party
 loop
  if cur_dj is distinct from r.dj then cur_dj:=r.dj; cur_mmr:=c.initial_mmr; end if;
  if r.n<c.min_votes then stat:='provisorio'; else stat:='oficial'; end if;
  if stat='oficial' then
   select * into calc from brb_private.mmr_calc(r.tier,r.media,r.n,cur_mmr);
   insert into brb_private.mmr_history(dj,party,event_date,club_id,club,tier,voters,som,harmonia,vibe,sofisticacao,media,cutoff,performance,confidence,progression,mmr_before,delta_theoretical,delta,mmr_after,status,params_version)
   values(r.dj,r.party,r.event_date,r.club_id,r.club_name,r.tier,r.n,r.som,r.harmonia,r.vibe,r.sofisticacao,r.media,calc.cutoff,calc.performance,calc.confidence,calc.progression,cur_mmr,calc.theoretical,calc.delta,calc.mmr_new,stat,c.version);
   cur_mmr:=calc.mmr_new;
  else
   insert into brb_private.mmr_history(dj,party,event_date,club_id,club,tier,voters,som,harmonia,vibe,sofisticacao,media,cutoff,mmr_before,mmr_after,status,params_version)
   select r.dj,r.party,r.event_date,r.club_id,r.club_name,r.tier,r.n,r.som,r.harmonia,r.vibe,r.sofisticacao,r.media,t.cutoff,cur_mmr,cur_mmr,stat,c.version
   from brb_private.mmr_tiers t where t.tier=r.tier;
  end if;
 end loop;
 update brb_private.mmr_state set dirty=false,last_run=now() where id;
end $$;
revoke all on function brb_private.mmr_process(boolean) from public,anon,authenticated;

commit;
