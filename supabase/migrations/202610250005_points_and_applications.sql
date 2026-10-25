-- 1) Pontos do Spotted: 5 por post com foto, 1 por comentário; 30 pontos viram 1 giro no álbum.
--    Tetos: até 40 pontos por dia (fuso de São Paulo). O gatilho nunca derruba a publicação: se algo falhar, o post sai sem pontos.
-- 2) Candidaturas do BRB Clubbers e resumo de pendências para o painel de moderação do owner.
-- Aditiva. Não mexe nas funções do feed nem das candidaturas.
begin;

alter table brb_private.album_accounts add column if not exists points integer not null default 0 check(points>=0 and points<30);

create table if not exists brb_private.points_ledger(
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  points integer not null check(points>0),
  created_at timestamptz not null default now(),
  primary key(user_id,reference)
);
alter table brb_private.points_ledger enable row level security;
revoke all on brb_private.points_ledger from public,anon,authenticated;

create or replace function brb_private.award_points(u uuid,pts integer,ref text) returns void
language plpgsql security definer set search_path='' as $$
declare today integer; gained integer;
begin
  if u is null or pts<=0 then return;end if;
  -- mesma trava do álbum: serializa com o sorteio
  perform pg_advisory_xact_lock(hashtextextended('brb-album:'||u::text,0));
  select coalesce(sum(l.points),0) into today from brb_private.points_ledger l
   where l.user_id=u and l.reference like 'spotted:%'
     and l.created_at>=(date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  if today+pts>40 then return;end if;
  insert into brb_private.points_ledger(user_id,reference,points) values(u,ref,pts) on conflict do nothing;
  if not found then return;end if;
  insert into brb_private.album_accounts(user_id) values(u) on conflict do nothing;
  select (a.points+pts)/30 into gained from brb_private.album_accounts a where a.user_id=u for update;
  update brb_private.album_accounts set points=(points+pts)%30,spins=spins+(points+pts)/30,updated_at=now() where user_id=u;
  if gained>0 then
    insert into brb_private.album_spin_ledger(user_id,reference,delta) values(u,'spotted-points:'||ref,gained) on conflict do nothing;
  end if;
end $$;
revoke all on function brb_private.award_points(uuid,integer,text) from public,anon,authenticated;

create or replace function brb_private.points_post() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  begin
    if new.img<>'' and not new.is_demo and new.owner is not null then
      perform brb_private.award_points(new.owner,5,'spotted:post:'||new.id);
    end if;
  exception when others then null;
  end;
  return new;
end $$;
revoke all on function brb_private.points_post() from public,anon,authenticated;
drop trigger if exists brb_points_post on brb_private.posts;
create trigger brb_points_post after insert on brb_private.posts for each row execute function brb_private.points_post();

create or replace function brb_private.points_comment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  begin
    perform brb_private.award_points(new.user_id,1,'spotted:comment:'||new.id::text);
  exception when others then null;
  end;
  return new;
end $$;
revoke all on function brb_private.points_comment() from public,anon,authenticated;
drop trigger if exists brb_points_comment on brb_private.comments;
create trigger brb_points_comment after insert on brb_private.comments for each row execute function brb_private.points_comment();

-- brb_owner: acrescenta mod_summary, app_list e submission_status (o resto fica igual à 202610250004).
create or replace function public.brb_owner(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed integer; k text; plist jsonb; alist jsonb;
begin
  if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
  then raise exception 'Confirme seu acesso na página da conta.';end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>900000 then raise exception 'Pedido inválido.';end if;
  if action='mod_summary' then
    return jsonb_build_object(
      'applications',(select count(*) from brb_private.submissions s where s.kind='application' and s.status='pending'),
      'posts',(select count(*) from brb_private.posts p where p.status='review'
                 or (p.status='published' and exists(select 1 from brb_private.reports r where r.post_id=p.id))));
  elsif action='app_list' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into alist from (
      select s.id,s.status,s.created_at,s.payload as data
      from brb_private.submissions s where s.kind='application' order by s.created_at desc limit 50) x;
    return jsonb_build_object('applications',alist);
  elsif action='submission_status' then
    if brb_owner.payload->>'status' not in ('approved','rejected','pending') then raise exception 'Status inválido.';end if;
    update brb_private.submissions set status=brb_owner.payload->>'status' where id=(brb_owner.payload->>'id')::uuid and kind='application';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Candidatura não encontrada.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:application:'||(brb_owner.payload->>'status'),brb_owner.payload->>'id');
  elsif action='mod_list' then
    select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into plist from (
      select p.id,p.title,p.party,p.body,p.img,p.status,p.anon,p.is_demo,p.created_at,
        (select pr.nick from brb_private.profiles pr where pr.user_id=p.owner) as nick,
        (select count(*) from brb_private.reports r where r.post_id=p.id) as reports,
        coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'anon',c.anon,
           'nick',(select cp.nick from brb_private.profiles cp where cp.user_id=c.user_id),'created_at',c.created_at) order by c.created_at)
           from brb_private.comments c where c.post_id=p.id),'[]'::jsonb) as comments
      from brb_private.posts p
      where p.status<>'published' or exists(select 1 from brb_private.reports r2 where r2.post_id=p.id)
      order by p.created_at desc limit 20) x;
    return jsonb_build_object('posts',plist);
  elsif action='post_status' then
    if brb_owner.payload->>'status' not in ('published','review','hidden') then raise exception 'Status inválido.';end if;
    update brb_private.posts set status=brb_owner.payload->>'status' where id=brb_owner.payload->>'id';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Post não encontrado.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:post_status:'||(brb_owner.payload->>'status'),brb_owner.payload->>'id');
  elsif action='post_delete' then
    delete from brb_private.posts where id=brb_owner.payload->>'id' and status='hidden';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Oculte o post antes de apagar de vez.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:post_delete',brb_owner.payload->>'id');
  elsif action='content_set' then
    k:=brb_owner.payload->>'key';
    if k is null or k !~ '^[a-z0-9:_./-]{1,120}$' or not (brb_owner.payload ? 'value') then raise exception 'Pedido inválido.';end if;
    insert into brb_private.site_content(key,value,updated_by) values(k,brb_owner.payload->'value',u)
      on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=u;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:content_set',k);
  elsif action='content_clear' then
    k:=brb_owner.payload->>'key';
    delete from brb_private.site_content where key=k;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:content_clear',coalesce(k,''));
  else raise exception 'Ação inválida.';
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_owner(text,jsonb) from public,anon;
grant execute on function public.brb_owner(text,jsonb) to authenticated;

commit;
