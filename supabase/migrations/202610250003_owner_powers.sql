-- Owner (administrador central): identificado só pelo e-mail CONFIRMADO no Supabase Auth.
-- Poderes: apagar posts, giros infinitos no álbum, editar textos e fotos do site (site_content).
-- Aditiva: não altera dados existentes. A transação inteira falha se algum ajuste do álbum não encaixar.
begin;

create table if not exists brb_private.site_content(
  key text primary key check(key ~ '^[a-z0-9:_./-]{1,120}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table brb_private.site_content enable row level security;
revoke all on brb_private.site_content from public,anon,authenticated;

create or replace function brb_private.is_owner(u uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select u is not null and exists(
    select 1 from auth.users
    where id=u and lower(email)='lucasjavaspellegrino@gmail.com' and email_confirmed_at is not null)
$$;
revoke all on function brb_private.is_owner(uuid) from public,anon,authenticated;

-- o owner também entra na equipe (painel /gestao), se a conta já existir
insert into brb_private.staff(user_id)
select id from auth.users where lower(email)='lucasjavaspellegrino@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

-- Leitura pública: apelido do owner (para o selo no Spotted) e os textos/fotos editados que começam com o prefixo.
create or replace function public.brb_content(prefix text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare res jsonb;
begin
  if prefix is null or prefix !~ '^[a-z0-9:_./-]{0,120}$' then raise exception 'Pedido inválido.';end if;
  select jsonb_build_object(
    'owner_nick',(select p.nick from brb_private.profiles p join auth.users x on x.id=p.user_id
                  where lower(x.email)='lucasjavaspellegrino@gmail.com' and x.email_confirmed_at is not null limit 1),
    'me_owner',brb_private.is_owner(auth.uid()),
    'items',coalesce((select jsonb_object_agg(c.key,c.value) from brb_private.site_content c where prefix<>'' and left(c.key,length(prefix))=prefix),'{}'::jsonb)
  ) into res;
  return res;
end $$;
revoke all on function public.brb_content(text) from public;
grant execute on function public.brb_content(text) to anon,authenticated;

-- Ações exclusivas do owner.
create or replace function public.brb_owner(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed integer; k text;
begin
  if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
  then raise exception 'Confirme seu acesso na página da conta.';end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>900000 then raise exception 'Pedido inválido.';end if;
  if action='post_delete' then
    delete from brb_private.posts where id=payload->>'id';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Post não encontrado.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:post_delete',payload->>'id');
  elsif action='content_set' then
    k:=payload->>'key';
    if k is null or k !~ '^[a-z0-9:_./-]{1,120}$' or not (payload ? 'value') then raise exception 'Pedido inválido.';end if;
    insert into brb_private.site_content(key,value,updated_by) values(k,payload->'value',u)
      on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=u;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:content_set',k);
  elsif action='content_clear' then
    k:=payload->>'key';
    delete from brb_private.site_content where key=k;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:content_clear',coalesce(k,''));
  else raise exception 'Ação inválida.';
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_owner(text,jsonb) from public,anon;
grant execute on function public.brb_owner(text,jsonb) to authenticated;

-- Álbum: giros infinitos para o owner (o sorteio continua sendo decidido pelo servidor).
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_album(text,jsonb)'::regprocedure) into definition;
  before:=definition;
  if position($a$if wallet<=0 then raise exception$a$ in definition)=0 then raise exception 'brb_album: trecho 1 não encontrado';end if;
  definition:=replace(definition,$a$if wallet<=0 then raise exception$a$,$b$if wallet<=0 and not brb_private.is_owner(u) then raise exception$b$);
  if position($a$set spins=spins-1,updated_at=now()$a$ in definition)=0 then raise exception 'brb_album: trecho 2 não encontrado';end if;
  definition:=replace(definition,$a$set spins=spins-1,updated_at=now()$a$,$b$set spins=case when brb_private.is_owner(u) then spins else spins-1 end,updated_at=now()$b$);
  if position($a$select jsonb_build_object('giros',wallet,$a$ in definition)=0 then raise exception 'brb_album: trecho 3 não encontrado';end if;
  definition:=replace(definition,$a$select jsonb_build_object('giros',wallet,$a$,$b$wallet:=case when brb_private.is_owner(u) then 99999 else wallet end; select jsonb_build_object('giros',wallet,$b$);
  if definition=before then raise exception 'brb_album: nada mudou';end if;
  execute definition;
end $mig$;

commit;
