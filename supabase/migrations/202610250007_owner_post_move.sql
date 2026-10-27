-- Owner pode mover um post (foto ou resenha) para outro clube/festa direto no site.
-- Só substitui brb_owner, acrescentando a ação post_move; as demais ficam iguais à 202610250005.
begin;

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
  elsif action='post_move' then
    if length(trim(coalesce(brb_owner.payload->>'party','')))<1 or length(brb_owner.payload->>'party')>120 then raise exception 'Informe a festa (até 120 caracteres).';end if;
    update brb_private.posts set party=trim(brb_owner.payload->>'party') where id=brb_owner.payload->>'id';
    get diagnostics changed=row_count;
    if changed<>1 then raise exception 'Post não encontrado.';end if;
    insert into brb_private.management_log(actor,action,target) values(u,'owner:post_move',brb_owner.payload->>'id');
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
