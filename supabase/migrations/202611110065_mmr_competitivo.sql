-- MMR competitivo dos DJs (substitui o modelo da migração 064).
-- Cada apresentação (DJ + festa) encerrada e com pelo menos 20 votantes únicos gera UMA movimentação oficial de MMR:
--   DELTA = P x D x Q x K
--   P = pontos máximos do tier (A 100, B 80, C 55, D 35, E 20)
--   D = clamp((média - corte) / (10 - corte), -1, 1)          corte: A 8,5 · B 8,0 · C 7,5 · D 7,0 · E 6,5
--   Q = min(1, n/(n+30) x ln(1+n)/ln(1001) x 1,03)            confiança pela quantidade de votantes
--   K = min(1, 500/max(500, MMR atual)) se D>0, senão 1         progressão: ganhar fica mais difícil quanto maior o MMR
-- Arredondamento: valor absoluto para o inteiro mais próximo, mínimo de 1 ponto quando D<>0, limitado a [-P,+P]. MMR nunca fica abaixo de 0.
-- Todo o histórico é recalculado em ordem cronológica de forma determinística (idempotente), com auditoria em brb_private.mmr_history.
begin;

drop table if exists brb_private.mmr_config;
drop table if exists brb_private.mmr_tiers;
drop function if exists brb_private.venue_tier(text);

create table brb_private.mmr_config(
 version integer primary key,
 initial_mmr integer not null,
 min_votes integer not null check(min_votes>=1),
 close_days integer not null check(close_days>=0),
 conf_prior numeric not null check(conf_prior>0),
 conf_cap integer not null check(conf_cap>1),
 conf_norm numeric not null check(conf_norm>0),
 prog_base numeric not null check(prog_base>0),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into brb_private.mmr_config(version,initial_mmr,min_votes,close_days,conf_prior,conf_cap,conf_norm,prog_base)
values(1,500,20,7,30,1000,1.03,500);

create table brb_private.mmr_tiers(
 tier text primary key check(tier in('A','B','C','D','E')),
 label text not null,
 points numeric not null check(points>0),
 cutoff numeric not null check(cutoff>=0 and cutoff<10)
);
insert into brb_private.mmr_tiers(tier,label,points,cutoff) values
 ('A','Elite',100,8.5),('B','Premium',80,8.0),('C','Alta relevância',55,7.5),('D','Relevância regional',35,7.0),('E','Demais clubes',20,6.5);

create table brb_private.mmr_divisions(
 name text primary key,
 min_mmr integer not null unique check(min_mmr>=0)
);
insert into brb_private.mmr_divisions(name,min_mmr) values
 ('Bronze',0),('Prata',400),('Ouro',600),('Diamante',800),('Master',1000),('Lendário',1200);

create table brb_private.clubs(
 id integer generated always as identity primary key,
 name text not null unique,
 tier text not null references brb_private.mmr_tiers(tier)
);
create table brb_private.club_aliases(
 alias text primary key check(alias ~ '^[a-z0-9]+$'),
 club_id integer not null references brb_private.clubs(id) on delete cascade
);
insert into brb_private.clubs(name,tier) values
 ('Green Valley','A'),('Laroc','A'),('Pedreira Paulo Leminski','A'),
 ('Surreal Park','B'),('D-EDGE São Paulo','B'),('Warung','B'),('Ame Club','B'),('P12 Jurerê','B'),
 ('Club Vibe','C'),('Park Art Superclub','C'),('D-EDGE Rio','C'),
 ('Terraza Music Park','D'),('CAOS','D'),('Matahari','D'),('Privilège Búzios','D');
insert into brb_private.club_aliases(alias,club_id)
 select a.alias,c.id from (values
  ('greenvalley','Green Valley'),('laroc','Laroc'),('pedreira','Pedreira Paulo Leminski'),
  ('surreal','Surreal Park'),('dedgesaopaulo','D-EDGE São Paulo'),('dedgesp','D-EDGE São Paulo'),('warung','Warung'),('ameclub','Ame Club'),('p12','P12 Jurerê'),
  ('clubvibe','Club Vibe'),('parkart','Park Art Superclub'),('dedgerio','D-EDGE Rio'),
  ('terraza','Terraza Music Park'),('caos','CAOS'),('matahari','Matahari'),('privilege','Privilège Búzios')
 ) a(alias,name) join brb_private.clubs c on c.name=a.name;

create table brb_private.mmr_history(
 dj text not null,
 party text not null,
 event_date date not null,
 club_id integer,
 club text not null,
 tier text not null references brb_private.mmr_tiers(tier),
 voters integer not null,
 som numeric not null,
 harmonia numeric not null,
 vibe numeric not null,
 sofisticacao numeric not null,
 media numeric not null,
 cutoff numeric not null,
 performance numeric,
 confidence numeric,
 progression numeric,
 mmr_before integer not null,
 delta_theoretical integer not null default 0,
 delta integer not null default 0,
 mmr_after integer not null,
 status text not null check(status in('oficial','provisorio','aberta')),
 params_version integer not null,
 processed_at timestamptz not null default now(),
 primary key(dj,party)
);
create index mmr_history_dj_idx on brb_private.mmr_history(dj,event_date desc);

create table brb_private.mmr_state(
 id boolean primary key default true check(id),
 dirty boolean not null default true,
 last_run timestamptz not null default 'epoch'
);
insert into brb_private.mmr_state default values;

alter table brb_private.mmr_config enable row level security;
alter table brb_private.mmr_tiers enable row level security;
alter table brb_private.mmr_divisions enable row level security;
alter table brb_private.clubs enable row level security;
alter table brb_private.club_aliases enable row level security;
alter table brb_private.mmr_history enable row level security;
alter table brb_private.mmr_state enable row level security;
revoke all on brb_private.mmr_config,brb_private.mmr_tiers,brb_private.mmr_divisions,brb_private.clubs,brb_private.club_aliases,brb_private.mmr_history,brb_private.mmr_state from public,anon,authenticated;

-- Marca o histórico como desatualizado sempre que votos ou eventos mudam.
create or replace function brb_private.mmr_mark_dirty() returns trigger
language plpgsql security definer set search_path='' as $$
begin update brb_private.mmr_state set dirty=true where id; return null; end $$;
revoke all on function brb_private.mmr_mark_dirty() from public,anon,authenticated;
create trigger mmr_dirty_submissions after insert or update or delete on brb_private.submissions for each statement execute function brb_private.mmr_mark_dirty();
create trigger mmr_dirty_events after insert or update or delete on brb_private.event_catalog for each statement execute function brb_private.mmr_mark_dirty();

-- Nome do clube sem acento, espaço ou pontuação, para casar com os aliases cadastrados.
create or replace function brb_private.club_norm(v text) returns text
language sql immutable set search_path='' as $$
 select regexp_replace(translate(lower(coalesce(v,'')),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]','','g');
$$;
revoke all on function brb_private.club_norm(text) from public,anon,authenticated;

-- Núcleo do cálculo (mesma conta de site/tests/mmr.js).
create or replace function brb_private.mmr_calc(p_tier text,p_media numeric,p_n integer,p_mmr integer,
 out performance numeric,out confidence numeric,out progression numeric,out theoretical integer,out delta integer,out mmr_new integer,out points numeric,out cutoff numeric)
language plpgsql stable set search_path='' as $$
declare c record; t record; raw numeric;
begin
 select * into c from brb_private.mmr_config where active order by version desc limit 1;
 select * into t from brb_private.mmr_tiers where tier=p_tier;
 if t.tier is null then raise exception 'Tier inválido'; end if;
 points:=t.points; cutoff:=t.cutoff;
 performance:=greatest(-1,least(1,(p_media-t.cutoff)/(10-t.cutoff)));
 confidence:=least(1,(p_n::numeric/(p_n+c.conf_prior))*(ln(1+p_n::numeric)/ln(1+c.conf_cap::numeric))*c.conf_norm);
 progression:=case when performance>0 then least(1,c.prog_base/greatest(c.prog_base,p_mmr::numeric)) else 1 end;
 raw:=t.points*performance*confidence*progression;
 if performance=0 then theoretical:=0;
 else theoretical:=(sign(performance)*least(t.points,greatest(1,floor(abs(raw)+0.5))))::integer; end if;
 mmr_new:=greatest(0,p_mmr+theoretical);
 delta:=mmr_new-p_mmr;
end $$;
revoke all on function brb_private.mmr_calc(text,numeric,integer,integer) from public,anon,authenticated;

-- Reprocessa todo o histórico em ordem cronológica. Só a votação encerrada (data do evento + close_days) com >= 20 votantes únicos pontua.
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
  if r.n<c.min_votes then stat:='provisorio';
  elsif r.event_date+c.close_days>=current_date then stat:='aberta';
  else stat:='oficial'; end if;
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

-- Calculadora pública (só conta, sem dados): usada nos exemplos do pop-up e para conferir os números da regra.
create or replace function public.brb_mmr_simulate(p_tier text,p_media numeric,p_votos integer,p_mmr integer default 500) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare k record;
begin
 if p_tier not in('A','B','C','D','E') or p_media is null or p_media<0 or p_media>10 or p_votos is null or p_votos<0 or p_mmr is null or p_mmr<0 then
  raise exception 'Parâmetros inválidos'; end if;
 select * into k from brb_private.mmr_calc(p_tier,p_media,p_votos,p_mmr);
 return jsonb_build_object('tier',p_tier,'corte',k.cutoff,'pontos',k.points,'desempenho',k.performance,'confianca',k.confidence,'progressao',k.progression,'variacao_teorica',k.theoretical,'variacao',k.delta,'mmr_novo',k.mmr_new);
end $$;
revoke all on function public.brb_mmr_simulate(text,numeric,integer,integer) from public;
grant execute on function public.brb_mmr_simulate(text,numeric,integer,integer) to anon,authenticated;

-- Ranking: posição pelo MMR; empate por apresentações oficiais, depois votantes válidos, depois nome do DJ.
create or replace function public.brb_ranking() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare res jsonb;
begin
 perform brb_private.mmr_process(false);
 with agg as (
  select h.dj name,count(*)::integer festas,count(*) filter(where h.status='oficial')::integer sets_n,sum(h.voters)::integer votos,
   sum(h.voters*h.som)/sum(h.voters) som,sum(h.voters*h.harmonia)/sum(h.voters) harmonia,
   sum(h.voters*h.vibe)/sum(h.voters) energia,sum(h.voters*h.sofisticacao)/sum(h.voters) sofisticacao,
   sum(h.voters*h.media)/sum(h.voters) m
  from brb_private.mmr_history h group by h.dj
 ), cur as (
  select distinct on (h.dj) h.dj name,h.mmr_after mmr from brb_private.mmr_history h order by h.dj,h.event_date desc,h.party desc
 ), lastv as (
  select distinct on (h.dj) h.dj name,h.delta ultima from brb_private.mmr_history h where h.status='oficial' order by h.dj,h.event_date desc,h.party desc
 ), ranked as (
  select a.*,c.mmr,l.ultima,
   (select d.name from brb_private.mmr_divisions d where d.min_mmr<=c.mmr order by d.min_mmr desc limit 1) divisao,
   row_number() over(order by c.mmr desc,a.sets_n desc,a.votos desc,a.name) pos
  from agg a join cur c on c.name=a.name left join lastv l on l.name=a.name
 ) select coalesce(jsonb_agg(jsonb_build_object(
   'name',r.name,'votos',r.votos,'festas',r.festas,'som',r.som,'harmonia',r.harmonia,'energia',r.energia,'sofisticacao',r.sofisticacao,
   'm',r.m,'nota',r.m,'mmr',r.mmr,'sets',r.sets_n,'ultima',r.ultima,'divisao',r.divisao,
   'provisorio',r.sets_n=0,'eligible',true,'pos',r.pos) order by r.pos),'[]'::jsonb) into res from ranked r;
 return res;
end $$;
revoke all on function public.brb_ranking() from public;
grant execute on function public.brb_ranking() to anon,authenticated;

-- Perfil do DJ: MMR atual, divisão, posição e histórico de movimentações.
create or replace function public.brb_dj_mmr(p_dj text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare rk jsonb; hist jsonb;
begin
 perform brb_private.mmr_process(false);
 select x into rk from jsonb_array_elements(public.brb_ranking()) x where x->>'name'=p_dj limit 1;
 select coalesce(jsonb_agg(jsonb_build_object('data',h.event_date,'clube',h.club,'tier',h.tier,'votantes',h.voters,'media',round(h.media,2),
   'som',round(h.som,2),'harmonia',round(h.harmonia,2),'vibe',round(h.vibe,2),'sofisticacao',round(h.sofisticacao,2),'corte',h.cutoff,
   'mmr_antes',h.mmr_before,'variacao',h.delta,'mmr_depois',h.mmr_after,'status',h.status) order by h.event_date desc,h.party desc),'[]'::jsonb)
  into hist from brb_private.mmr_history h where h.dj=p_dj;
 return jsonb_build_object('ranking',rk,'historico',hist);
end $$;
revoke all on function public.brb_dj_mmr(text) from public;
grant execute on function public.brb_dj_mmr(text) to anon,authenticated;

commit;
