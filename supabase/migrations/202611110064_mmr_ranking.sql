-- Ranking dos DJs por MMR (pontos, no estilo do ranking da FIFA). A posição passa a ser definida pelo MMR; a Nota é a média das notas.
-- Cada apresentação (DJ + festa) mexe nos pontos do DJ: pontos pela média x alcance (quantas pessoas votaram, comparado ao "set típico" do site).
--   pontos pela média  = teto do nível do clube x (média - corte) / (10 - corte)   acima do corte
--                        teto do nível do clube x (média - corte) / 2               abaixo do corte (no mínimo -teto)
--   alcance            = 1 + 0,5 x log2(votos do set / set típico), entre 0,3 e 2,0
--   set típico         = mediana de votos por apresentação nos últimos 90 dias (mínimo 10, máximo 150; 10 enquanto não houver dados)
--   MMR                = 1000 + soma dos pontos das apresentações dos últimos 365 dias
-- Quem tem menos de 30 avaliadores aparece com posição "provisória". Os parâmetros ficam em mmr_config e mmr_tiers (versionados).
begin;

create table brb_private.mmr_config(
 version integer primary key,
 base_points numeric not null,
 window_days integer not null check(window_days between 30 and 1095),
 typical_default numeric not null check(typical_default>0),
 typical_min numeric not null check(typical_min>0),
 typical_max numeric not null,
 typical_days integer not null check(typical_days between 7 and 365),
 min_votes_set integer not null check(min_votes_set>=1),
 reach_min numeric not null,
 reach_max numeric not null,
 provisional_voters integer not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table brb_private.mmr_config enable row level security;
revoke all on brb_private.mmr_config from public,anon,authenticated;
insert into brb_private.mmr_config(version,base_points,window_days,typical_default,typical_min,typical_max,typical_days,min_votes_set,reach_min,reach_max,provisional_voters)
values(1,1000,365,10,10,150,90,1,0.3,2.0,30);

create table brb_private.mmr_tiers(
 tier text primary key check(tier in('A','B','C','D')),
 teto numeric not null check(teto>0),
 corte numeric not null check(corte>=0 and corte<10)
);
alter table brb_private.mmr_tiers enable row level security;
revoke all on brb_private.mmr_tiers from public,anon,authenticated;
insert into brb_private.mmr_tiers(tier,teto,corte) values('A',100,8.0),('B',80,7.5),('C',55,7.0),('D',35,6.5);

-- Nível do clube a partir do nome do local no catálogo de eventos. Fora da lista conhecida = nível D.
create or replace function brb_private.venue_tier(v text) returns text
language sql immutable set search_path='' as $$
 select case
  when v ~* '^(green ?valley|laroc|surreal|pedreira)' then 'A'
  when v ~* '^(d-edge s|warung|ame club|p12)' then 'B'
  when v ~* '^(club vibe|vibe|park art|d-edge rio)' then 'C'
  else 'D' end;
$$;
revoke all on function brb_private.venue_tier(text) from public,anon,authenticated;

create or replace function public.brb_ranking() returns jsonb
language sql stable security definer set search_path='' as $$
 with cfg as (select * from brb_private.mmr_config where active order by version desc limit 1),
 valid as (
  select s.identity,s.payload->>'dj' dj,s.payload->>'party' party,s.payload->'notas' notas,s.created_at,e.event_date,e.venue
  from brb_private.submissions s
  join auth.users u on u.id::text=s.identity
  join brb_private.event_catalog e on e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj')
  where s.kind='vote' and s.status='approved' and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
   and s.payload->'notas' ?& array['som','harmonia','energia','sofisticacao']
 ), latest as (
  select distinct on (identity,dj,party) identity,dj,party,notas,event_date,venue
  from valid order by identity,dj,party,created_at desc
 ), recent as (
  select l.* from latest l cross join cfg c where l.event_date>=current_date-c.window_days
 ), djsets as (
  select dj,party,max(event_date) event_date,max(venue) venue,count(*) n,
   avg((notas->>'som')::numeric) som,avg((notas->>'harmonia')::numeric) harmonia,
   avg((notas->>'energia')::numeric) energia,avg((notas->>'sofisticacao')::numeric) sofisticacao
  from recent group by dj,party
 ), typ as (
  select case when p.med is null then c.typical_default
   else least(c.typical_max,greatest(c.typical_min,p.med)) end tip
  from cfg c
  left join lateral (
   select (percentile_cont(0.5) within group (order by x.n))::numeric med
   from djsets x where x.event_date>=current_date-c.typical_days
  ) p on true
 ), pts as (
  select x.dj,x.party,x.event_date,x.venue,x.n,t.tier,
   case when (x.som+x.harmonia+x.energia+x.sofisticacao)/4>=t.corte
    then t.teto*((x.som+x.harmonia+x.energia+x.sofisticacao)/4-t.corte)/(10-t.corte)
    else greatest(-t.teto,t.teto*((x.som+x.harmonia+x.energia+x.sofisticacao)/4-t.corte)/2) end
   * least(c.reach_max,greatest(c.reach_min,1+0.5*ln(x.n::numeric/ty.tip)/ln(2::numeric))) p
  from djsets x
  cross join cfg c
  cross join typ ty
  join brb_private.mmr_tiers t on t.tier=brb_private.venue_tier(x.venue)
  where x.n>=c.min_votes_set
 ), djp as (
  select dj name,count(*) sets_n,round(sum(p),2) pontos from pts group by dj
 ), best as (
  select distinct on (dj) dj name,venue venue_name from pts order by dj,tier,event_date desc
 ), agg as (
  select dj name,count(*) votos,count(distinct party) festas,
   avg((notas->>'som')::numeric) som,avg((notas->>'harmonia')::numeric) harmonia,
   avg((notas->>'energia')::numeric) energia,avg((notas->>'sofisticacao')::numeric) sofisticacao
  from recent group by dj
 ), final as (
  select a.name,a.votos,a.festas,a.som,a.harmonia,a.energia,a.sofisticacao,
   (a.som+a.harmonia+a.energia+a.sofisticacao)/4 m,
   c.base_points+coalesce(d.pontos,0) mmr,coalesce(d.pontos,0) pontos,coalesce(d.sets_n,0) sets_n,
   d.name is not null tem,a.votos<c.provisional_voters provisorio,b.venue_name,ty.tip tipico
  from agg a
  cross join cfg c
  cross join typ ty
  left join djp d on d.name=a.name
  left join best b on b.name=a.name
 ), ranked as (
  select f.*,case when f.tem then row_number() over(partition by f.tem order by f.mmr desc,f.votos desc,f.m desc,f.name) end pos
  from final f
 ) select coalesce(jsonb_agg(jsonb_build_object(
  'name',r.name,'votos',r.votos,'festas',r.festas,'som',r.som,'harmonia',r.harmonia,'energia',r.energia,'sofisticacao',r.sofisticacao,
  'm',r.m,'nota',r.m,'mmr',case when r.tem then round(r.mmr,1) end,'pontos',round(r.pontos,1),'sets',r.sets_n,
  'provisorio',r.provisorio,'eligible',r.tem,'pos',r.pos,'venue_name',r.venue_name,'tipico',r.tipico
 ) order by not r.tem,r.pos,r.m desc,r.votos desc,r.name),'[]'::jsonb) from ranked r;
$$;
revoke all on function public.brb_ranking() from public;
grant execute on function public.brb_ranking() to anon,authenticated;

commit;
