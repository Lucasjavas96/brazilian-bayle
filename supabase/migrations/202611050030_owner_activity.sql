-- Painel de atividade do owner: lista de todas as contas e linha do tempo das ações (cadastro, avaliação, post, comentário,
-- reação, quiz, roleta e candidatura). Só leitura e só para o owner (is_owner). Nada é publicado.
begin;
create or replace function public.brb_activity(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 u uuid:=auth.uid();
 q text:=lower(coalesce(trim(payload->>'q'),''));
 lim integer:=least(greatest(coalesce(nullif(payload->>'limit','')::integer,200),1),500);
 uid uuid:=nullif(payload->>'user_id','')::uuid;
begin
 if u is null or not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if action='users' then
  return jsonb_build_object('users',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from (
   select x.id,x.email,p.nick,x.created_at,(x.email_confirmed_at is not null) confirmed,x.last_sign_in_at,
    (select count(*) from brb_private.submissions s where s.kind='vote' and s.identity=x.id::text) votes,
    (select count(*) from brb_private.posts po where po.owner=x.id and not po.is_demo) posts,
    (select count(*) from brb_private.comments c where c.user_id=x.id) comments
   from auth.users x left join brb_private.profiles p on p.user_id=x.id
   where q='' or lower(x.email) like '%'||q||'%' or lower(coalesce(p.nick,'')) like '%'||q||'%'
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
   select ev.at,ev.user_id,x.email,p.nick,ev.type,ev.detail
   from ev join auth.users x on x.id=ev.user_id left join brb_private.profiles p on p.user_id=x.id
   where (uid is null or ev.user_id=uid) and (q='' or lower(x.email) like '%'||q||'%' or lower(coalesce(p.nick,'')) like '%'||q||'%')
   order by ev.at desc limit lim) r));
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_activity(text,jsonb) from public,anon;
grant execute on function public.brb_activity(text,jsonb) to authenticated;
commit;
