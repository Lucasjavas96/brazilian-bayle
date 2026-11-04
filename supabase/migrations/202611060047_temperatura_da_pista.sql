-- Temperatura da Pista: cada conta confirmada diz se vai às festas anunciadas (vou com certeza, quero ir, não vou).
-- A contagem é pública; a resposta de cada um só a própria conta vê. Dá para mudar até o dia da festa.
begin;

create table brb_private.interest_events(
 id text primary key check(id ~ '^[a-z0-9-]{3,80}$'),
 event_date date not null,
 venue text not null,
 title text not null
);
alter table brb_private.interest_events enable row level security;
revoke all on brb_private.interest_events from public,anon,authenticated;

create table brb_private.party_interest(
 user_id uuid not null references auth.users(id) on delete cascade,
 event_id text not null references brb_private.interest_events(id) on delete cascade,
 choice text not null check(choice in ('c','q','n')),
 updated_at timestamptz not null default now(),
 primary key(user_id,event_id)
);
alter table brb_private.party_interest enable row level security;
revoke all on brb_private.party_interest from public,anon,authenticated;

insert into brb_private.interest_events(id,event_date,venue,title) values
('greenvalley-2026-11-21','2026-11-21','Green Valley','PAWSA · Aniversário de 19 anos'),
('greenvalley-2026-12-28','2026-12-28','Green Valley','Miss Monique'),
('greenvalley-2026-12-29','2026-12-29','Green Valley','Monolink'),
('greenvalley-2026-12-30','2026-12-30','Arena Open','DNA Art Car · Vintage Culture'),
('greenvalley-2026-12-31','2026-12-31','Green Valley','Réveillon Greenvalley 2027'),
('greenvalley-2027-01-02','2027-01-02','Green Valley','ARTBAT'),
('greenvalley-2027-01-06','2027-01-06','Green Valley','Marco Carola + Franky Rizardo'),
('greenvalley-2027-01-09','2027-01-09','Green Valley','Black Coffee'),
('greenvalley-2027-02-06','2027-02-06','Green Valley','Carnaval · Adriatique'),
('greenvalley-2027-02-07','2027-02-07','Green Valley','Carnaval · Vintage Culture'),
('greenvalley-2027-02-08','2027-02-08','Green Valley','Carnaval · Fisher');

create or replace function public.brb_interest(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); ev text:=payload->>'event'; ch text:=nullif(payload->>'choice','');
begin
 if action='set' then
  if u is null or not exists(select 1 from auth.users x where x.id=u and x.email_confirmed_at is not null) then
   return jsonb_build_object('login',false);
  end if;
  if not exists(select 1 from brb_private.interest_events e where e.id=ev) then raise exception 'Festa não encontrada.';end if;
  if exists(select 1 from brb_private.interest_events e where e.id=ev and e.event_date<current_date) then raise exception 'Essa festa já aconteceu.';end if;
  if ch is null then
   delete from brb_private.party_interest where user_id=u and event_id=ev;
  elsif ch in ('c','q','n') then
   insert into brb_private.party_interest(user_id,event_id,choice) values(u,ev,ch)
   on conflict(user_id,event_id) do update set choice=excluded.choice,updated_at=now();
  else raise exception 'Resposta inválida.';
  end if;
 elsif action<>'list' then raise exception 'Ação inválida.';
 end if;
 return jsonb_build_object(
  'login',u is not null,
  'counts',coalesce((select jsonb_object_agg(e.id,jsonb_build_object(
    'c',(select count(*) from brb_private.party_interest p where p.event_id=e.id and p.choice='c'),
    'q',(select count(*) from brb_private.party_interest p where p.event_id=e.id and p.choice='q'),
    'n',(select count(*) from brb_private.party_interest p where p.event_id=e.id and p.choice='n')))
   from brb_private.interest_events e),'{}'::jsonb),
  'mine',coalesce((select jsonb_object_agg(p.event_id,p.choice) from brb_private.party_interest p where u is not null and p.user_id=u),'{}'::jsonb));
end $$;
revoke all on function public.brb_interest(text,jsonb) from public;
grant execute on function public.brb_interest(text,jsonb) to anon,authenticated;
commit;
