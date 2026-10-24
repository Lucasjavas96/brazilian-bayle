-- Isolated Brazilian Bayle data. Does not alter existing bb_* or other apps.
begin;
create schema if not exists brb_private;
revoke all on schema brb_private from public,anon,authenticated;
create table brb_private.profiles(user_id uuid primary key references auth.users(id) on delete cascade,nick text not null check(nick ~ '^[A-Za-z0-9_.]{3,24}$'),created_at timestamptz not null default now());
create unique index brb_nick_unique on brb_private.profiles(lower(nick));
create table brb_private.submissions(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('vote','application','waitlist')),identity text not null,payload jsonb not null,status text not null default 'pending',created_at timestamptz not null default now());
create unique index brb_vote_unique on brb_private.submissions(identity,(payload->>'party'),(payload->>'dj')) where kind='vote';
create unique index brb_waitlist_unique on brb_private.submissions(identity) where kind='waitlist';
create table brb_private.posts(id text primary key default gen_random_uuid()::text,owner uuid references auth.users(id) on delete cascade,title text not null,party text not null,img text not null default '',body text not null default '',anon boolean not null default false,is_demo boolean not null default false,status text not null default 'published',created_at timestamptz not null default now());
create table brb_private.reactions(post_id text references brb_private.posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,key text not null,anon boolean not null default true,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table brb_private.comments(id uuid primary key default gen_random_uuid(),post_id text references brb_private.posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,body text not null,anon boolean not null default true,created_at timestamptz not null default now());
create table brb_private.reports(post_id text references brb_private.posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
alter table brb_private.profiles enable row level security;
alter table brb_private.submissions enable row level security;
alter table brb_private.posts enable row level security;
alter table brb_private.reactions enable row level security;
alter table brb_private.comments enable row level security;
alter table brb_private.reports enable row level security;

create function public.brb_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();v jsonb;ident text;pid text;kind text;k text;nick text;rowp brb_private.posts%rowtype;res jsonb;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>650000 then raise exception 'Dados inválidos.';end if;
 if action in('vote','application','waitlist') then
  if payload->>'consent'<>'true' or not(payload ? 'consent') then raise exception 'Confirme o consentimento.';end if;
  if action='vote' then
   ident:=lower(trim(payload->>'ig'));ident:=regexp_replace(ident,'^@','');
   if ident !~ '^[a-z0-9._]{2,30}$' or ident is null or length(trim(coalesce(payload->>'name','')))<2 or length(payload->>'name')>120 then raise exception 'Confira nome e Instagram.';end if;
   if not ((payload->>'party'='gv-0709' and payload->>'dj'=any(array['Alok','Mochakk','Classmatic'])) or (payload->>'party'='sr-1409' and payload->>'dj'=any(array['Vintage Culture','Liu','Öwnboss'])) or (payload->>'party'='wr-2109' and payload->>'dj'=any(array['ANNA','Victor Ruiz','Gui Boratto'])) or (payload->>'party'='lr-2809' and payload->>'dj'=any(array['Cat Dealers','Dubdogz','KVSH'])) or (payload->>'party'='gv-1210' and payload->>'dj'=any(array['Zerb','Mojjo','Beltran','Illusionize']))) then raise exception 'Apresentação inválida.';end if;
   foreach k in array array['som','harmonia','energia','sofisticacao'] loop
    if jsonb_typeof(payload->'notas'->k)<>'number' or payload->'notas'->k is null then raise exception 'Avalie os quatro critérios.';end if;
    if (payload->'notas'->>k)::numeric not between 0 and 10 then raise exception 'Notas entre zero e dez.';end if;
   end loop;
   if length(coalesce(payload->>'comment',''))>1000 then raise exception 'Comentário muito longo.';end if;
   -- Membership weight and publication status cannot be supplied by the browser.
   v:=jsonb_build_object('party',payload->>'party','dj',payload->>'dj','name',trim(payload->>'name'),'ig','@'||ident,'notas',payload->'notas','comment',payload->>'comment','clubber_declared',payload->'clubber','verified_weight',1,'is_demo',true,'consent_at',now());
  else
   ident:=lower(trim(payload->>'email'));
   if ident is null or ident !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' or length(ident)>254 then raise exception 'Confira o e-mail.';end if;
   if action='application' then
    if length(trim(coalesce(payload->>'nome','')))<2 or length(coalesce(payload->>'nome',''))>120 or coalesce(payload->>'instagram','') !~ '^@?[A-Za-z0-9._]{2,30}$' or length(coalesce(payload->>'motivo',''))>2000 then raise exception 'Confira os dados da candidatura.';end if;
    v:=jsonb_build_object('nome',payload->>'nome','instagram',payload->>'instagram','email',ident,'cidade',left(payload->>'cidade',100),'quero',payload->'quero','motivo',payload->>'motivo','consent_at',now());
   else v:=jsonb_build_object('email',ident,'tamanho',left(payload->>'tamanho',20),'interesses',payload->'int','consent_at',now());end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(action||ident,0));
  if exists(select 1 from brb_private.submissions s where s.kind=action and s.identity=ident and s.created_at>now()-interval '30 seconds') then raise exception 'Aguarde alguns segundos antes de enviar novamente.';end if;
  insert into brb_private.submissions(kind,identity,payload) values(action,ident,v);
  return jsonb_build_object('ok',true);
 end if;
 if action='feed' then
  select coalesce(jsonb_agg(jsonb_build_object(
   'id',p.id,'owner',case when p.owner=u then u::text else null end,'nick',case when p.anon and p.owner is distinct from u then '' else coalesce(pr.nick,'brazilianbayle') end,
   'anon',p.anon,'title',p.title,'party',p.party,'img',p.img,'text',p.body,'at',p.created_at,'is_demo',p.is_demo,
   'r',coalesce((select jsonb_object_agg(t.key,t.n) from(select key,count(*) n from brb_private.reactions where post_id=p.id group by key)t),'{}'::jsonb),
   'myReaction',coalesce((select key from brb_private.reactions where post_id=p.id and user_id=u),''),
   'reactors',coalesce((select jsonb_agg(jsonb_build_object('k',r.key,'who',case when r.anon then 'Anônimo' else '@'||rp.nick end)) from brb_private.reactions r join brb_private.profiles rp on rp.user_id=r.user_id where r.post_id=p.id),'[]'::jsonb),
   'c',coalesce((select jsonb_agg(jsonb_build_object('t',c.body,'who',case when c.anon then 'Anônimo' else '@'||cp.nick end) order by c.created_at) from brb_private.comments c join brb_private.profiles cp on cp.user_id=c.user_id where c.post_id=p.id),'[]'::jsonb)
  ) order by p.created_at desc),'[]'::jsonb) into res from (select p.* from brb_private.posts p where p.status='published' and not exists(select 1 from brb_private.reports rr where rr.post_id=p.id and rr.user_id=u) order by p.created_at desc limit 50)p left join brb_private.profiles pr on pr.user_id=p.owner;
  return res;
 end if;
 if u is null then raise exception 'Entre na sua conta para continuar.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if action='profile_save' then
  nick:=trim(payload->>'nick');if nick is null or nick !~ '^[A-Za-z0-9_.]{3,24}$' then raise exception 'Nickname: 3 a 24 letras, números, ponto ou sublinhado.';end if;
  insert into brb_private.profiles(user_id,nick) values(u,nick) on conflict(user_id) do update set nick=excluded.nick;
  return jsonb_build_object('nick',nick);
 end if;
 if action='profile_get' then select jsonb_build_object('nick',p.nick) into res from brb_private.profiles p where user_id=u;return res;end if;
 if not exists(select 1 from brb_private.profiles where user_id=u) then raise exception 'Complete seu nickname para continuar.';end if;
 if action='post_create' then
  if exists(select 1 from brb_private.posts where owner=u and created_at>now()-interval '60 seconds') then raise exception 'Espere um minuto entre publicações.';end if;
  if length(trim(coalesce(payload->>'title','')))<1 or length(payload->>'title')>80 or length(trim(coalesce(payload->>'party','')))<1 or length(payload->>'party')>120 or length(coalesce(payload->>'text',''))>500 then raise exception 'Confira título, festa e resenha.';end if;
  if coalesce(payload->>'img','')<>'' and (payload->>'img') !~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$' then raise exception 'Foto inválida.';end if;
  if coalesce(payload->>'img','')='' and trim(coalesce(payload->>'text',''))='' then raise exception 'Adicione foto ou resenha.';end if;
  insert into brb_private.posts(owner,title,party,img,body,anon) values(u,trim(payload->>'title'),trim(payload->>'party'),coalesce(payload->>'img',''),coalesce(payload->>'text',''),coalesce((payload->>'anon')::boolean,false)) returning id into pid;
  return jsonb_build_object('id',pid);
 end if;
 pid:=payload->>'post_id';select * into rowp from brb_private.posts where id=pid and status='published';if not found then raise exception 'Publicação indisponível.';end if;
 if action='post_edit' then
  if rowp.owner is distinct from u then raise exception 'Você não pode editar esta publicação.';end if;
  if length(trim(coalesce(payload->>'text','')))<1 or length(payload->>'text')>500 then raise exception 'Resenha de até 500 caracteres.';end if;
  update brb_private.posts set body=payload->>'text' where id=pid;
 elsif action='react' then
  k:=payload->>'key';if k is null or not(k=any(array['fino','gusta','queria','eita','tenebroso','nefastos','bicho','ousadia','caneco','bailao','abobora','beyblade','passinho','tomando'])) then raise exception 'Reação inválida.';end if;
  if exists(select 1 from brb_private.reactions where post_id=pid and user_id=u and key=k) then delete from brb_private.reactions where post_id=pid and user_id=u;
  else insert into brb_private.reactions(post_id,user_id,key,anon) values(pid,u,k,coalesce((payload->>'anon')::boolean,true)) on conflict(post_id,user_id) do update set key=excluded.key,anon=excluded.anon;end if;
 elsif action='comment' then
  if exists(select 1 from brb_private.comments where user_id=u and created_at>now()-interval '15 seconds') then raise exception 'Aguarde antes de comentar novamente.';end if;
  if length(trim(coalesce(payload->>'text','')))<1 or length(payload->>'text')>200 then raise exception 'Comentário de até 200 caracteres.';end if;
  insert into brb_private.comments(post_id,user_id,body,anon) values(pid,u,trim(payload->>'text'),coalesce((payload->>'anon')::boolean,true));
 elsif action='report' then
  insert into brb_private.reports(post_id,user_id) values(pid,u) on conflict do nothing;
  if (select count(*) from brb_private.reports where post_id=pid)>=3 then update brb_private.posts set status='review' where id=pid;end if;
 else raise exception 'Operação inválida.';end if;
 return jsonb_build_object('ok',true);
exception when unique_violation then raise exception 'Este registro já existe. Confira se o voto, e-mail ou nickname já foi usado.';
end $$;
revoke all on function public.brb_action(text,jsonb) from public;
grant execute on function public.brb_action(text,jsonb) to anon,authenticated;
commit;
