-- BRB Clubber no Spotted: selo para membro aprovado, remoção de membro e uma candidatura por e-mail de verdade.
-- 1) Une candidaturas repetidas do mesmo e-mail (fica a aprovada; se não houver, a mais antiga) e cria índice único.
-- 2) brb_content passa a devolver os @ dos membros ativos (candidatura aprovada com o e-mail da conta confirmada).
-- 3) brb_members ganha a ação remove: o membro vira status removed, perde o selo e deixa de poder comentar.
-- 4) brb_action bloqueia comentário de membro removido. Aprovar de novo na aba Candidaturas devolve o acesso.
begin;

delete from brb_private.submissions s
using (
  select id,row_number() over(partition by lower(identity) order by (status='approved') desc,created_at,id::text) as rn
  from brb_private.submissions where kind='application'
) d
where s.id=d.id and d.rn>1;

create unique index if not exists brb_application_unique on brb_private.submissions(lower(identity)) where kind='application';

create or replace function public.brb_content(prefix text default '') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare res jsonb;
begin
  if prefix is null or prefix !~ '^[a-z0-9:_./-]{0,120}$' then raise exception 'Pedido inválido.';end if;
  select jsonb_build_object(
    'owner_nick',(select p.nick from brb_private.profiles p join auth.users x on x.id=p.user_id
                  where lower(x.email)='lucasjavaspellegrino@gmail.com' and x.email_confirmed_at is not null limit 1),
    'me_owner',brb_private.is_owner(auth.uid()),
    'clubber_nicks',coalesce((select jsonb_agg(distinct p.nick) from brb_private.submissions s
                  join auth.users x on lower(x.email)=lower(s.identity) and x.email_confirmed_at is not null
                  join brb_private.profiles p on p.user_id=x.id
                  where s.kind='application' and s.status='approved'),'[]'::jsonb),
    'items',coalesce((select jsonb_object_agg(c.key,c.value) from brb_private.site_content c where prefix<>'' and left(c.key,length(prefix))=prefix),'{}'::jsonb)
  ) into res;
  return res;
end $$;
revoke all on function public.brb_content(text) from public;
grant execute on function public.brb_content(text) to anon,authenticated;

create or replace function public.brb_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ident text; phone text; res jsonb;
begin
 if auth.uid() is not null and action not in ('feed','application','waitlist')
 and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
 and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
 if action='comment' and exists(
   select 1 from brb_private.submissions s join auth.users x on lower(x.email)=lower(s.identity)
   where x.id=auth.uid() and s.kind='application' and s.status='removed')
 then raise exception 'Seu acesso para comentar foi removido pela equipe.';end if;
 if action='vote' then return brb_private.account_vote(payload);end if;
 if action='application' then
  if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Dados inválidos.';end if;
  phone:=regexp_replace(coalesce(payload->>'telefone',''),'[^0-9]','','g');
  if phone ~ '^55[0-9]{10,11}$' then phone:=substr(phone,3);end if;
  if phone !~ '^[1-9][0-9][0-9]{8,9}$' then raise exception 'Informe o celular com DDD.';end if;
  ident:=lower(trim(coalesce(payload->>'email','')));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(action||ident,0));
  if exists(select 1 from brb_private.submissions s where s.kind='application' and lower(s.identity)=ident) then
   raise exception 'Este e-mail já enviou uma candidatura. Aguarde a análise da equipe.';
  end if;
  res:=brb_private.action_core(action,payload);
  update brb_private.submissions s set payload=s.payload||jsonb_build_object('telefone',phone)
   where s.kind='application' and lower(s.identity)=ident;
  return res;
 end if;
 return brb_private.action_core(action,payload);
end $$;
revoke all on function public.brb_action(text,jsonb) from public;
grant execute on function public.brb_action(text,jsonb) to anon,authenticated;

create or replace function public.brb_members(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid; app record; res jsonb; changed integer;
begin
 if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Confirme seu acesso na página da conta.';end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>2000 then raise exception 'Pedido inválido.';end if;
 if action='list' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into res from (
   select s.id,s.created_at,s.payload as data,
    (select max(m.sent_at) from brb_private.member_mails m where m.submission_id=s.id) as mailed_at
   from brb_private.submissions s where s.kind='application' and s.status='approved'
   order by s.created_at desc limit 500) x;
  return jsonb_build_object('members',res);
 end if;
 if action='remove' then
  begin sid:=(payload->>'id')::uuid; exception when others then raise exception 'Pedido inválido.'; end;
  update brb_private.submissions set status='removed' where id=sid and kind='application' and status='approved';
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Membro não encontrado ou já removido.';end if;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:member_remove',sid::text);
  return jsonb_build_object('ok',true);
 end if;
 if action in ('mail_prepare','mail_done') then
  begin sid:=(payload->>'id')::uuid; exception when others then raise exception 'Pedido inválido.'; end;
  select s.id,s.payload into app from brb_private.submissions s where s.id=sid and s.kind='application' and s.status='approved';
  if not found then raise exception 'Membro não encontrado ou não aprovado.';end if;
  if action='mail_prepare' then
   return jsonb_build_object('email',app.payload->>'email','nome',app.payload->>'nome');
  end if;
  insert into brb_private.member_mails(submission_id,sent_by) values(sid,u);
  insert into brb_private.management_log(actor,action,target) values(u,'owner:member_mail',sid::text);
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_members(text,jsonb) from public,anon;
grant execute on function public.brb_members(text,jsonb) to authenticated;

commit;
