-- Corrige elegibilidade, paginação e recompensas sem reescrever migrações aplicadas.
begin;

-- Nenhum voto ou nota já registrado é excluído. Novos votos exigem line-up confirmado.
update brb_private.event_catalog set lineup='[]'::jsonb,
 source='Agenda informada pela Brazilian Bayle; participantes brasileiros pendentes de confirmação.'
where source like '%line-up a confirmar%';

create function public.brb_moderation_page(section text,filter_name text default 'todos',cursor jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); rows jsonb; total bigint; last_row jsonb; ct timestamptz; ci text;
begin
 if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Confirme seu acesso na página da conta.';end if;
 if section is null or section not in ('posts','apps') or filter_name is null or filter_name not in ('todos','denunciado','review','hidden')
 then raise exception 'Filtro inválido.';end if;
 if cursor is not null then
  if jsonb_typeof(cursor)<>'object' or octet_length(cursor::text)>500 or cursor->>'at' is null or cursor->>'id' is null then raise exception 'Página inválida.';end if;
  ct:=(cursor->>'at')::timestamptz;ci:=cursor->>'id';
 end if;
 if section='apps' then
  select count(*) into total from brb_private.submissions s where s.kind='application';
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id::text desc),'[]'::jsonb) into rows from (
   select s.id,s.status,s.created_at,s.payload as data from brb_private.submissions s where s.kind='application'
   and (ct is null or (s.created_at,s.id::text)<(ct,ci)) order by s.created_at desc,s.id::text desc limit 50
  ) x;
 else
  select count(*) into total from brb_private.posts p
  where (p.status<>'published' or exists(select 1 from brb_private.reports r where r.post_id=p.id))
   and (filter_name='todos' or (filter_name='denunciado' and exists(select 1 from brb_private.reports r where r.post_id=p.id)) or p.status=filter_name);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into rows from (
   select p.id,p.title,p.party,p.body,p.img,p.status,p.anon,p.is_demo,p.created_at,
    (select pr.nick from brb_private.profiles pr where pr.user_id=p.owner) as nick,
    (select count(*) from brb_private.reports r where r.post_id=p.id) as reports,
    coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'anon',c.anon,
     'nick',(select pr.nick from brb_private.profiles pr where pr.user_id=c.user_id),'created_at',c.created_at) order by c.created_at,c.id)
     from brb_private.comments c where c.post_id=p.id),'[]'::jsonb) as comments
   from brb_private.posts p
   where (p.status<>'published' or exists(select 1 from brb_private.reports r where r.post_id=p.id))
    and (filter_name='todos' or (filter_name='denunciado' and exists(select 1 from brb_private.reports r where r.post_id=p.id)) or p.status=filter_name)
    and (ct is null or (p.created_at,p.id)<(ct,ci)) order by p.created_at desc,p.id desc limit 20
  ) x;
 end if;
 last_row:=rows->(jsonb_array_length(rows)-1);
 return jsonb_build_object('items',rows,'total',total,'next',case when jsonb_array_length(rows)=case when section='apps' then 50 else 20 end
  then jsonb_build_object('at',last_row->>'created_at','id',last_row->>'id') else null end);
end $$;
revoke all on function public.brb_moderation_page(text,text,jsonb) from public,anon;
grant execute on function public.brb_moderation_page(text,text,jsonb) to authenticated;

-- O intervalo não depende mais de comentários que o autor pode apagar.
create table brb_private.comment_activity(
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_at timestamptz not null
);
alter table brb_private.comment_activity enable row level security;
revoke all on brb_private.comment_activity from public,anon,authenticated;
insert into brb_private.comment_activity select user_id,max(created_at) from brb_private.comments where user_id is not null group by user_id;
create function brb_private.comment_cooldown() returns trigger
language plpgsql security definer set search_path='' as $$
declare last_time timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('brb-comment:'||new.user_id::text,0));
 select last_at into last_time from brb_private.comment_activity where user_id=new.user_id;
 if last_time>clock_timestamp()-interval '15 seconds' then raise exception 'Aguarde antes de comentar novamente.';end if;
 insert into brb_private.comment_activity values(new.user_id,clock_timestamp()) on conflict(user_id) do update set last_at=excluded.last_at;
 return new;
end $$;
revoke all on function brb_private.comment_cooldown() from public,anon,authenticated;
create trigger brb_comment_cooldown before insert on brb_private.comments for each row execute function brb_private.comment_cooldown();

-- Mesma resenha no mesmo post não rende outro giro se for apagada/republicada.
-- Impressão digital independente do UUID do comentário; mantém o teto de 40/dia.
-- Backfill de deduplicação sem conceder giros nem alterar saldos já existentes.
create table brb_private.comment_reward_keys(
 user_id uuid references auth.users(id) on delete cascade,
 fingerprint text not null, primary key(user_id,fingerprint)
);
alter table brb_private.comment_reward_keys enable row level security;
revoke all on brb_private.comment_reward_keys from public,anon,authenticated;
insert into brb_private.comment_reward_keys
select distinct c.user_id,md5(c.post_id||':'||lower(regexp_replace(trim(c.body),'\s+',' ','g')))
from brb_private.comments c join brb_private.points_ledger l on l.user_id=c.user_id and l.reference='spotted:comment:'||c.id::text;
create or replace function brb_private.points_comment() returns trigger
language plpgsql security definer set search_path='' as $$
declare fp text;
begin
 begin
  fp:=md5(new.post_id||':'||lower(regexp_replace(trim(new.body),'\s+',' ','g')));
  insert into brb_private.comment_reward_keys values(new.user_id,fp) on conflict do nothing;
  if found then perform brb_private.award_points(new.user_id,1,'spotted:comment-content:'||fp);end if;
 exception when others then null;
 end;
 return new;
end $$;
revoke all on function brb_private.points_comment() from public,anon,authenticated;

commit;
