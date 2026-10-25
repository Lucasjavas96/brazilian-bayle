-- Moderação do owner (posts reversíveis, lista de moderação) e apagar comentário (autor ou owner).
-- Aditiva: só cria/atualiza funções. Substitui brb_owner da migração 202610250003 mantendo as ações antigas.
begin;

create or replace function public.brb_owner(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed integer; k text; res jsonb; plist jsonb;
begin
  if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
  then raise exception 'Confirme seu acesso na página da conta.';end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>900000 then raise exception 'Pedido inválido.';end if;
  if action='mod_list' then
    -- posts que pedem moderação: denunciados, em análise ou ocultos (até 20, mais recentes primeiro)
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
    if payload->>'status' not in ('published','review','hidden') then raise exception 'Status inválido.';end if;
    update brb_private.posts set status=payload->>'status' where id=payload->>'id';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Post não encontrado.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:post_status:'||(payload->>'status'),payload->>'id');
  elsif action='post_delete' then
    -- só apaga de vez o que já está oculto: evita perder um post por clique sem querer
    delete from brb_private.posts where id=payload->>'id' and status='hidden';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Oculte o post antes de apagar de vez.';end if;
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

-- Comentários com id, para o cliente poder apagar. Mesma ordem e mesmas regras de anonimato do feed.
create or replace function public.brb_comments_for(ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); res jsonb;
begin
  if ids is null or cardinality(ids)>80 then raise exception 'Pedido inválido.';end if;
  select coalesce(jsonb_object_agg(g.post_id,g.items),'{}'::jsonb) into res from (
    select c.post_id,
      jsonb_agg(jsonb_build_object('id',c.id,'t',c.body,
        'who',case when c.anon then 'Anônimo' else '@'||cp.nick end,
        'can',coalesce(c.user_id=u,false) or brb_private.is_owner(u)) order by c.created_at) as items
    from brb_private.comments c
    join brb_private.profiles cp on cp.user_id=c.user_id
    join brb_private.posts p on p.id=c.post_id and p.status='published'
    where c.post_id=any(ids)
    group by c.post_id) g;
  return res;
end $$;
revoke all on function public.brb_comments_for(text[]) from public;
grant execute on function public.brb_comments_for(text[]) to anon,authenticated;

create or replace function public.brb_comment_delete(comment_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); author uuid;
begin
  if u is null then raise exception 'Entre na sua conta para continuar.';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
  then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
  select c.user_id into author from brb_private.comments c where c.id=comment_id;
  if not found then raise exception 'Comentário não encontrado.';end if;
  if author<>u and not brb_private.is_owner(u) then raise exception 'Você só pode apagar o seu próprio comentário.';end if;
  delete from brb_private.comments where id=comment_id;
  if author<>u then insert into brb_private.management_log(actor,action,target) values(u,'owner:comment_delete',comment_id::text);end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_comment_delete(uuid) from public,anon;
grant execute on function public.brb_comment_delete(uuid) to authenticated;

commit;
