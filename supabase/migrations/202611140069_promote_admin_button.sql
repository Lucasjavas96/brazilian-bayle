-- Botão "Promover a administrador" na aba Membros da moderação: o owner passa a poder
-- dar ou tirar acesso à equipe (painel /gestao) direto pela tela, sem precisar de migração.
begin;

-- brb_owner ganha a ação staff_set (promover/remover administrador).
create or replace function public.brb_owner(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed integer; k text; target uuid; enable boolean;
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
  elsif action='staff_set' then
    begin target:=(payload->>'user_id')::uuid; exception when others then raise exception 'Pedido inválido.'; end;
    if target is null then raise exception 'Pedido inválido.';end if;
    if not (payload ? 'enable') or jsonb_typeof(payload->'enable')<>'boolean' then raise exception 'Pedido inválido.';end if;
    enable:=(payload->>'enable')::boolean;
    if not exists(select 1 from auth.users where id=target and email_confirmed_at is not null) then
      raise exception 'Conta não encontrada ou e-mail não confirmado.';
    end if;
    if enable then
      insert into brb_private.staff(user_id) values(target) on conflict do nothing;
    else
      if brb_private.is_owner(target) then raise exception 'O owner não pode ser removido da equipe.';end if;
      delete from brb_private.staff where user_id=target;
    end if;
    insert into brb_private.management_log(actor,action,target) values(u,case when enable then 'owner:staff_add' else 'owner:staff_remove' end,target::text);
  else raise exception 'Ação inválida.';
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_owner(text,jsonb) from public,anon;
grant execute on function public.brb_owner(text,jsonb) to authenticated;

-- A lista de contas (aba Membros) passa a informar quem já é administrador (staff).
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_activity(text,jsonb)'::regprocedure) into definition;
  before:=definition;
  if position($a$select x.id,x.email,p.nick,x.created_at,x.last_sign_in_at,$a$ in definition)=0 then raise exception 'brb_activity: trecho não encontrado';end if;
  definition:=replace(definition,
    $a$select x.id,x.email,p.nick,x.created_at,x.last_sign_in_at,$a$,
    $b$select x.id,x.email,p.nick,x.created_at,x.last_sign_in_at,exists(select 1 from brb_private.staff st where st.user_id=x.id) as is_staff,$b$);
  if definition=before then raise exception 'brb_activity: nada mudou';end if;
  execute definition;
end $mig$;

commit;
