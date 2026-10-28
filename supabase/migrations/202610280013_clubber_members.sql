-- BRB Clubbers: celular obrigatório, uma candidatura por e-mail e lista de membros aprovados para o owner.
-- Aditiva. Não reescreve brb_private.action_core nem brb_owner: a brb_action só ganha uma etapa antes da candidatura.
begin;

-- Registro dos e-mails de aprovação enviados (um por envio).
create table if not exists brb_private.member_mails(
  id bigserial primary key,
  submission_id uuid not null references brb_private.submissions(id) on delete cascade,
  sent_by uuid,
  sent_at timestamptz not null default now()
);
alter table brb_private.member_mails enable row level security;
revoke all on brb_private.member_mails from public,anon,authenticated;

create or replace function public.brb_action(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ident text; phone text; res jsonb;
begin
 if auth.uid() is not null and action not in ('feed','application','waitlist')
 and exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
 and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
 if action='vote' then return brb_private.account_vote(payload);end if;
 if action='application' then
  if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Dados inválidos.';end if;
  phone:=regexp_replace(coalesce(payload->>'telefone',''),'[^0-9]','','g');
  if phone ~ '^55[0-9]{10,11}$' then phone:=substr(phone,3);end if;
  if phone !~ '^[1-9][0-9][0-9]{8,9}$' then raise exception 'Informe o celular com DDD.';end if;
  ident:=lower(trim(coalesce(payload->>'email','')));
  -- mesma trava da validação original: serializa candidaturas do mesmo e-mail
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(action||ident,0));
  if exists(select 1 from brb_private.submissions s where s.kind='application' and s.identity=ident) then
   raise exception 'Este e-mail já enviou uma candidatura. Aguarde a análise da equipe.';
  end if;
  res:=brb_private.action_core(action,payload);
  update brb_private.submissions s set payload=s.payload||jsonb_build_object('telefone',phone)
   where s.kind='application' and s.identity=ident;
  return res;
 end if;
 return brb_private.action_core(action,payload);
end $$;
revoke all on function public.brb_action(text,jsonb) from public;
grant execute on function public.brb_action(text,jsonb) to anon,authenticated;

-- Aba Membros: só owner.
create or replace function public.brb_members(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid; app record; res jsonb;
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
