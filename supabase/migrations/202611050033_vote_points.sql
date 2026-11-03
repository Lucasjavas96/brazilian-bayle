-- Pontos da avaliação de DJ: 3 pontos pela avaliação e mais 5 se ela vier com resenha (total 8), 1 ponto = 1 giro na roleta do álbum.
-- Vale uma vez por pessoa e DJ (reavaliar o mesmo DJ em outra festa não soma de novo; a resenha pode ser acrescentada depois e soma uma vez).
-- Sem o teto diário do Spotted. Também credita agora as avaliações que já existem, e mostra os pontos de cada conta no painel do owner.
begin;

create or replace function brb_private.award_points_nocap(u uuid,pts integer,ref text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if u is null or pts<=0 then return;end if;
 perform pg_advisory_xact_lock(hashtextextended('brb-album:'||u::text,0));
 insert into brb_private.points_ledger(user_id,reference,points) values(u,ref,pts) on conflict do nothing;
 if not found then return;end if;
 insert into brb_private.album_accounts(user_id) values(u) on conflict do nothing;
 update brb_private.album_accounts set spins=spins+pts,updated_at=now() where user_id=u;
 insert into brb_private.album_spin_ledger(user_id,reference,delta) values(u,'spotted-points:'||ref,pts) on conflict do nothing;
end $$;
revoke all on function brb_private.award_points_nocap(uuid,integer,text) from public,anon,authenticated;

create or replace function brb_private.points_vote() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid uuid; dj text;
begin
 begin
  if new.kind<>'vote' then return new;end if;
  uid:=nullif(new.payload->>'user_id','')::uuid; dj:=new.payload->>'dj';
  if uid is null or dj is null then return new;end if;
  perform brb_private.award_points_nocap(uid,3,'vote:'||md5(dj));
  if length(btrim(coalesce(new.payload->>'comment','')))>0 then perform brb_private.award_points_nocap(uid,5,'vote-review:'||md5(dj));end if;
 exception when others then null;
 end;
 return new;
end $$;
revoke all on function brb_private.points_vote() from public,anon,authenticated;
drop trigger if exists brb_points_vote on brb_private.submissions;
create trigger brb_points_vote after insert on brb_private.submissions for each row execute function brb_private.points_vote();

-- avaliações que já existem
do $$
declare r record;
begin
 for r in select s.payload->>'user_id' as uid,s.payload->>'dj' as dj,bool_or(length(btrim(coalesce(s.payload->>'comment','')))>0) as rev
  from brb_private.submissions s where s.kind='vote' and s.payload->>'user_id' ~ '^[0-9a-f-]{36}$' and s.payload->>'dj' is not null group by 1,2
 loop
  begin
   perform brb_private.award_points_nocap(r.uid::uuid,3,'vote:'||md5(r.dj));
   if r.rev then perform brb_private.award_points_nocap(r.uid::uuid,5,'vote-review:'||md5(r.dj));end if;
  exception when others then null;
  end;
 end loop;
end $$;

create or replace function public.brb_activity(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid();
 q text:=lower(coalesce(trim(payload->>'q'),''));
 lim integer:=least(greatest(coalesce(nullif(payload->>'limit','')::integer,200),1),500);
 uid uuid:=nullif(payload->>'user_id','')::uuid;
 k text:=nullif(trim(coalesce(payload->>'key','')),'');
begin
 if u is null or not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if action='dismiss' then
  if k is null or length(k)>120 then raise exception 'Linha inválida.';end if;
  insert into brb_private.activity_dismissed(key) values(k) on conflict do nothing;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:activity_dismiss',k);
  return jsonb_build_object('ok',true);
 elsif action='restore' then
  delete from brb_private.activity_dismissed;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:activity_restore','all');
  return jsonb_build_object('ok',true);
 elsif action='members' then
  return jsonb_build_object('accounts',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (
   select x.id,x.email,p.nick,x.created_at,x.last_sign_in_at,
    (select a.payload->>'nome' from brb_private.submissions a where a.kind='application' and a.identity=lower(x.email) order by a.created_at desc limit 1) nome,
    exists(select 1 from brb_private.submissions a where a.kind='application' and a.identity=lower(x.email) and a.status='approved') clubber,
   
 coalesce((select sum(l.points) from brb_private.points_ledger l where l.user_id=x.id),0) as points,
    coalesce((select a.spins from brb_private.album_accounts a where a.user_id=x.id),0) as spins,
    (5*(select count(*) from brb_private.posts po where po.owner=x.id and not po.is_demo and po.img<>'')
     +(select count(*) from brb_private.comments c where c.user_id=x.id)
     +3*(select count(distinct s.payload->>'dj') from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text)
     +5*(select count(distinct s.payload->>'dj') from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text and length(btrim(coalesce(s.payload->>'comment','')))>0)) as points_expected,
    (select count(*) from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text) votes,
    (select count(*) from brb_private.posts po where po.owner=x.id and not po.is_demo) posts,
    (select count(*) from brb_private.comments c where c.user_id=x.id) comments
   from auth.users x left join brb_private.profiles p on p.user_id=x.id
   where x.email_confirmed_at is not null
    and (q='' or lower(x.email) like '%'||q||'%' or lower(coalesce(p.nick,'')) like '%'||q||'%')
   order by x.created_at desc limit lim) r));
 elsif action='users' then
  return jsonb_build_object('users',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (
   select x.id,'user:'||x.id::text as key,x.email,p.nick,x.created_at,(x.email_confirmed_at is not null) confirmed,x.last_sign_in_at,
   
 coalesce((select sum(l.points) from brb_private.points_ledger l where l.user_id=x.id),0) as points,
    coalesce((select a.spins from brb_private.album_accounts a where a.user_id=x.id),0) as spins,
    (5*(select count(*) from brb_private.posts po where po.owner=x.id and not po.is_demo and po.img<>'')
     +(select count(*) from brb_private.comments c where c.user_id=x.id)
     +3*(select count(distinct s.payload->>'dj') from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text)
     +5*(select count(distinct s.payload->>'dj') from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text and length(btrim(coalesce(s.payload->>'comment','')))>0)) as points_expected,
    (select count(*) from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text) votes,
    (select count(*) from brb_private.posts po where po.owner=x.id and not po.is_demo) posts,
    (select count(*) from brb_private.comments c where c.user_id=x.id) comments
   from auth.users x left join brb_private.profiles p on p.user_id=x.id
   where (q='' or lower(x.email) like '%'||q||'%' or lower(coalesce(p.nick,'')) like '%'||q||'%')
    and not exists(select 1 from brb_private.activity_dismissed d where d.key='user:'||x.id::text)
   order by x.created_at desc limit lim) r));
 elsif action='feed' then
  return jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(r) order by r.at desc),'[]'::jsonb) from (
   with ev as (
    select x.created_at as at,x.id as user_id,'conta'::text as type,'Criou a conta'::text as detail from auth.users x
    union all select x.email_confirmed_at,x.id,'conta','Confirmou o e-mail' from auth.users x where x.email_confirmed_at is not null
    union all select x.last_sign_in_at,x.id,'conta','Último acesso (entrou na conta)' from auth.users x where x.last_sign_in_at is not null
    union all select s.created_at,case when s.identity ~ '^[0-9a-f-]{36}$' then s.identity::uuid end,'avaliação',
      'Avaliou '||(s.payload->>'dj')||' · '||coalesce((select e.title||' ('||to_char(e.event_date,'DD/MM')||')' from brb_private.event_catalog e where e.id=s.payload->>'party'),s.payload->>'party')
      ||' · média '||round(((s.payload->'notas'->>'som')::numeric+(s.payload->'notas'->>'harmonia')::numeric+(s.payload->'notas'->>'energia')::numeric+(s.payload->'notas'->>'sofisticacao')::numeric)/4,1)
      ||case when length(btrim(coalesce(s.payload->>'comment','')))>0 then ' · resenha: '||left(btrim(s.payload->>'comment'),160) else '' end
     from brb_private.submissions s where s.kind='vote'
    union all select s.created_at,(select u2.id from auth.users u2 where lower(u2.email)=s.identity limit 1),'candidatura','Candidatura BRB Clubber ('||s.status||')'
     from brb_private.submissions s where s.kind='application'
    union all select po.created_at,po.owner,'spotted','Postou: '||left(po.title,80) from brb_private.posts po where po.owner is not null and not po.is_demo
    union all select c.created_at,c.user_id,'spotted','Comentou: '||left(c.body,100) from brb_private.comments c
    union all select rc.created_at,rc.user_id,'spotted','Reagiu ('||rc.key||')' from brb_private.reactions rc
    union all select qc.created_at,qc.user_id,'quiz','Acertou no quiz: '||qc.question from brb_private.quiz_correct qc
    union all select d.created_at,d.user_id,'álbum','Girou a roleta: '||d.card_slug||case when d.duplicate then ' (repetida)' else '' end from brb_private.album_draws d
   )
   select ev.at,ev.user_id,'ev:'||md5(ev.user_id::text||ev.at::text||ev.detail) as key,x.email,p.nick,ev.type,ev.detail
   from ev join auth.users x on x.id=ev.user_id left join brb_private.profiles p on p.user_id=x.id
   where (uid is null or ev.user_id=uid) and (q='' or lower(x.email) like '%'||q||'%' or lower(coalesce(p.nick,'')) like '%'||q||'%')
    and not exists(select 1 from brb_private.activity_dismissed d where d.key='ev:'||md5(ev.user_id::text||ev.at::text||ev.detail))
   order by ev.at desc limit lim) r));
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_activity(text,jsonb) from public,anon;
grant execute on function public.brb_activity(text,jsonb) to authenticated;
commit;
