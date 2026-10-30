-- Brazilian Bayle Ranking Score (BRS): nota única do DJ = qualidade (média dos 4 critérios, com regularização bayesiana)
-- x fator de volume de avaliadores (até 15%) x fator do melhor local comprovado (até 10%).
-- Cada pessoa conta uma vez por DJ (vale a avaliação mais recente). DJ com menos de 30 avaliadores fica "em avaliação", sem posição.
-- Os parâmetros ficam em ranking_config (versionados). Os locais e os shows confirmados são editoriais: nenhuma associação é inventada.
begin;

create table brb_private.ranking_config(
 version integer primary key,
 prior_global_mean numeric not null,
 prior_strength numeric not null,
 vote_reference integer not null,
 volume_weight numeric not null,
 venue_weight numeric not null,
 minimum_votes integer not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into brb_private.ranking_config(version,prior_global_mean,prior_strength,vote_reference,volume_weight,venue_weight,minimum_votes)
values(1,7.5,30,2000,0.15,0.10,30);

create table brb_private.ranking_venues(
 id integer generated always as identity primary key,
 name text not null unique,
 city text,
 state text,
 editorial_rank integer unique check(editorial_rank between 1 and 15),
 is_active boolean not null default true,
 notes text
);
insert into brb_private.ranking_venues(name,city,state,editorial_rank,is_active,notes) values
('Green Valley','Camboriú','SC',1,true,null),
('Laroc Club','Valinhos','SP',2,true,null),
('Surreal Park','Camboriú','SC',3,true,null),
('Pedreira Paulo Leminski','Curitiba','PR',4,true,'Espaço de shows: só vale apresentação do DJ em evento de música eletrônica.'),
('D-EDGE São Paulo','São Paulo','SP',5,true,null),
('Warung Beach Club (histórico)','Itajaí','SC',6,false,'Encerrou a operação na Praia Brava em junho de 2026. Apresentações passadas verificadas continuam válidas; nunca cadastrar show novo.'),
('Ame Club','Valinhos','SP',7,true,null),
('P12 Jurerê','Florianópolis','SC',8,true,null),
('Club Vibe','Curitiba','PR',9,true,null),
('Park Art Superclub','Pinhais','PR',10,true,null),
('D-EDGE Rio','Rio de Janeiro','RJ',11,true,null),
('CAOS','Campinas','SP',12,true,null),
('Terraza Music Park','Florianópolis','SC',13,true,null),
('Matahari Music Stage','Indaial','SC',14,true,null),
('Privilège Búzios','Armação dos Búzios','RJ',15,true,null);

create table brb_private.dj_verified_performances(
 id bigint generated always as identity primary key,
 dj_name text not null,
 venue_id integer not null references brb_private.ranking_venues(id),
 event_date date not null,
 verification_status text not null default 'pending' check(verification_status in ('pending','confirmed','rejected')),
 source_url text,
 verified_at timestamptz,
 unique(dj_name,venue_id,event_date)
);
alter table brb_private.ranking_config enable row level security;
alter table brb_private.ranking_venues enable row level security;
alter table brb_private.dj_verified_performances enable row level security;

create or replace function public.brb_ranking() returns jsonb
language sql stable security definer set search_path='' as $$
 with cfg as (select * from brb_private.ranking_config where active order by version desc limit 1),
 valid as (
 select s.identity,s.payload->>'dj' dj,s.payload->>'party' party,s.payload->'notas' notas,s.created_at
 from brb_private.submissions s join auth.users u on u.id::text=s.identity
 where s.kind='vote' and s.status='approved' and s.payload->>'user_id'=u.id::text and u.email_confirmed_at is not null
 and exists(select 1 from brb_private.event_catalog e where e.id=s.payload->>'party' and e.event_date<=current_date and e.lineup ? (s.payload->>'dj'))
 ), latest as (
 select distinct on (identity,dj) identity,dj,notas from valid order by identity,dj,created_at desc
 ), averages as (
 select dj name,count(*) n,
 avg((notas->>'som')::numeric) som,avg((notas->>'harmonia')::numeric) harmonia,
 avg((notas->>'energia')::numeric) energia,avg((notas->>'sofisticacao')::numeric) sofisticacao
 from latest group by dj
 ), parties as (
 select dj name,count(distinct party) festas from valid group by dj
 ), venue as (
 select distinct on (p.dj_name) p.dj_name name,v.editorial_rank,v.name venue_name
 from brb_private.dj_verified_performances p join brb_private.ranking_venues v on v.id=p.venue_id
 where p.verification_status='confirmed' and v.editorial_rank between 1 and 15
 order by p.dj_name,v.editorial_rank
 ), scored as (
 select a.name,a.n,pa.festas,a.som,a.harmonia,a.energia,a.sofisticacao,
 (a.som+a.harmonia+a.energia+a.sofisticacao)/4 m,
 v.editorial_rank venue_rank,v.venue_name,c.minimum_votes,
 ((a.n*(a.som+a.harmonia+a.energia+a.sofisticacao)/4)+c.prior_strength*c.prior_global_mean)/(a.n+c.prior_strength) q,
 (1-c.volume_weight)+c.volume_weight*least(a.n::numeric/c.vote_reference,1) fv,
 (1-c.venue_weight)+c.venue_weight*coalesce((16-v.editorial_rank)/15.0,0) fc,
 a.n>=c.minimum_votes eligible
 from averages a cross join cfg c join parties pa on pa.name=a.name left join venue v on v.name=a.name
 ), final as (
 select s.*,s.q*s.fv*s.fc brs from scored s
 ), ranked as (
 select f.*,case when f.eligible then row_number() over(partition by f.eligible order by f.brs desc,f.n desc,f.q desc,f.name) end pos
 from final f
 ) select coalesce(jsonb_agg(jsonb_build_object(
 'name',r.name,'votos',r.n,'festas',r.festas,'som',r.som,'harmonia',r.harmonia,'energia',r.energia,'sofisticacao',r.sofisticacao,
 'm',r.m,'q',r.q,'fv',r.fv,'fc',r.fc,'venue_rank',r.venue_rank,'venue_name',r.venue_name,
 'eligible',r.eligible,'pos',r.pos,'nota',case when r.eligible then r.brs end,'brs',case when r.eligible then r.brs end
 ) order by r.eligible desc,r.pos,r.m desc,r.n desc,r.name),'[]'::jsonb) from ranked r;
$$;
revoke all on function public.brb_ranking() from public;
grant execute on function public.brb_ranking() to anon,authenticated;

-- Ferramenta administrativa (só owner): lista os locais e os shows e confirma ou remove apresentações verificadas.
create or replace function public.brb_ranking_admin(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); vid integer; pid bigint; dj text;
begin
 if u is null or not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if action='list' then
  return jsonb_build_object(
   'venues',(select coalesce(jsonb_agg(to_jsonb(v) order by v.editorial_rank),'[]'::jsonb) from brb_private.ranking_venues v),
   'performances',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'dj',p.dj_name,'venue',v.name,'rank',v.editorial_rank,'date',p.event_date,'status',p.verification_status,'source',p.source_url) order by p.event_date desc),'[]'::jsonb)
    from brb_private.dj_verified_performances p join brb_private.ranking_venues v on v.id=p.venue_id));
 elsif action='confirm' then
  dj:=nullif(trim(payload->>'dj'),'');
  select id into vid from brb_private.ranking_venues where editorial_rank=(payload->>'rank')::integer;
  if dj is null or vid is null or (payload->>'date') is null then raise exception 'Informe DJ, posição do local e data.';end if;
  if (payload->>'rank')::integer=6 and (payload->>'date')::date>date '2026-06-30' then raise exception 'O Warung da Praia Brava encerrou em junho de 2026.';end if;
  insert into brb_private.dj_verified_performances(dj_name,venue_id,event_date,verification_status,source_url,verified_at)
  values(dj,vid,(payload->>'date')::date,'confirmed',nullif(payload->>'source',''),now())
  on conflict(dj_name,venue_id,event_date) do update set verification_status='confirmed',source_url=excluded.source_url,verified_at=now()
  returning id into pid;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:ranking_venue_confirm',pid::text);
  return jsonb_build_object('ok',true,'id',pid);
 elsif action='remove' then
  delete from brb_private.dj_verified_performances where id=(payload->>'id')::bigint;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:ranking_venue_remove',payload->>'id');
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_ranking_admin(text,jsonb) from public,anon;
grant execute on function public.brb_ranking_admin(text,jsonb) to authenticated;
commit;
