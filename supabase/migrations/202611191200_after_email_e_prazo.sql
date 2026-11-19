-- Onde é o after?: e-mails de pedido de vaga e decisão, e prazo de pagamento de 24h (era 12h).
-- * quem cadastrou o after recebe e-mail quando alguém pede vaga (sob aprovação);
-- * quem pediu recebe e-mail quando o anfitrião aprova ou recusa; se for pago, o e-mail de
--   aprovação traz o link para pagar, com o prazo de 24h explícito antes de a vaga liberar.
begin;

create table brb_private.after_mail(
 id uuid primary key default gen_random_uuid(),
 after_id uuid not null references brb_private.afters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 stage text not null check(stage in ('pedido_novo','confirmado','pagamento','recusado')),
 sent_at timestamptz,
 claimed_at timestamptz,
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 unique(after_id,user_id,stage)
);
alter table brb_private.after_mail enable row level security;
revoke all on brb_private.after_mail from public,anon,authenticated;

create function brb_private.after_queue_mail() returns trigger
language plpgsql security definer set search_path='' as $$
declare host_uid uuid;
begin
 if tg_op='INSERT' and new.status='pendente' then
  select host into host_uid from brb_private.afters where id=new.after_id;
  if host_uid is not null then
   insert into brb_private.after_mail(after_id,user_id,recipient_id,stage) values(new.after_id,new.user_id,host_uid,'pedido_novo') on conflict do nothing;
  end if;
 elsif tg_op='UPDATE' and new.status is distinct from old.status and old.status='pendente' and new.status in ('confirmado','pagamento','recusado') then
  insert into brb_private.after_mail(after_id,user_id,recipient_id,stage) values(new.after_id,new.user_id,new.user_id,new.status) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger after_queue_mail after insert or update of status on brb_private.after_joins
for each row execute function brb_private.after_queue_mail();

-- Mesmo corpo de antes; só muda o prazo de 12h para 24h quando um pedido aprovado precisa de pagamento.
create or replace function public.brb_after(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a brb_private.afters; j brb_private.after_joins; aid uuid; tid uuid; n int; st text; s1 int; s2 int; s3 int;
 x jsonb; md boolean; mo text;
begin
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Dados inválidos.';end if;
 if action is null or action not in ('list','create','join','leave','decide','end','rate','remove','approve','reject','payout') then raise exception 'Ação inválida.';end if;
 md:=brb_private.is_after_mod(u);

 if action='list' then
  return jsonb_build_object('me_mod',md,'items',coalesce((select jsonb_agg(y order by y.created_at desc) from (
   select a2.id,a2.nome,a2.festa,a2.bairro,a2.hora,a2.vagas,a2.modo,a2.descr as "desc",a2.regras,a2.preco_cents,a2.comodidades,a2.fotos,a2.status,a2.created_at,
    case when u is not null and (a2.host=u or md) then a2.motivo else '' end as motivo,
    (select p.nick from brb_private.profiles p where p.user_id=a2.host) as host,
    brb_private.after_taken(a2.id) as ocupadas,
    case when a2.lat is null then null when u is not null and (a2.host=u or md
      or exists(select 1 from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u and jj.status='confirmado'))
     then jsonb_build_object('lat',a2.lat,'lng',a2.lng,'exato',true)
     else jsonb_build_object('lat',round(a2.lat+((abs(hashtextextended(a2.id::text||'lat',0))%1000)/1000.0-0.5)*0.006,4),
                             'lng',round(a2.lng+((abs(hashtextextended(a2.id::text||'lng',0))%1000)/1000.0-0.5)*0.007,4),'exato',false) end as geo,
    case when u is null then null else (select jj.hold_until from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u and jj.status='pagamento') end as my_hold,
    case when u is not null and (a2.host=u or md) and a2.preco_cents>0 then (select jsonb_build_object('pagos',count(*),'total_host_cents',coalesce(sum(pp.host_cents),0),
      'repassado',count(*)>0 and bool_and(pp.payout_ref is not null),'payout_ref',max(pp.payout_ref))
      from brb_private.after_payments pp where pp.after_id=a2.id and pp.status='paid') else null end as vendas,
    case when u is not null and (a2.host=u or md
      or exists(select 1 from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u and jj.status='confirmado'))
     then a2.endereco else null end as endereco,
    case when u is null then null else (select jj.status from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u) end as my,
    case when u is null then false else exists(select 1 from brb_private.after_ratings r where r.after_id=a2.id and r.user_id=u) end as rated,
    coalesce((select jsonb_agg(jsonb_build_object('som',r.som,'espaco',r.espaco,'fraternidade',r.fraternidade)) from brb_private.after_ratings r where r.after_id=a2.id),'[]'::jsonb) as notas,
    case when u is not null and a2.host=u then coalesce((select jsonb_agg(jsonb_build_object('uid',jj.user_id,'nome',pp.nick,
       'status',case jj.status when 'confirmado' then 'aprovado' else jj.status end) order by jj.created_at)
       from brb_private.after_joins jj join brb_private.profiles pp on pp.user_id=jj.user_id where jj.after_id=a2.id),'[]'::jsonb)
     else '[]'::jsonb end as reqs
   from brb_private.afters a2
   where a2.status in ('aberto','encerrado') or (u is not null and a2.status<>'removido' and (a2.host=u or (md and a2.status='analise')))
   order by a2.created_at desc limit 200
  ) y),'[]'::jsonb));
 end if;

 if u is null then raise exception 'Entre na sua conta para continuar.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
 if not exists(select 1 from brb_private.profiles where user_id=u) then raise exception 'Crie seu @ do Instagram na conta antes.';end if;

 if action='create' then
  perform pg_advisory_xact_lock(hashtextextended('after-create:'||u::text,0));
  if (select count(*) from brb_private.afters y where y.host=u and y.status in ('analise','aberto'))>=5
  then raise exception 'Você já tem 5 afters no ar ou em análise. Encerre um antes de anunciar outro.';end if;
  x:=brb_private.after_fields(payload);
  insert into brb_private.afters(host,lat,lng,nome,festa,bairro,endereco,hora,vagas,modo,descr,regras,preco_cents,comodidades,fotos,status)
  values(u,(x->>'lat')::numeric,(x->>'lng')::numeric,x->>'nome',x->>'festa',x->>'bairro',x->>'endereco',x->>'hora',(x->>'vagas')::int,x->>'modo',x->>'desc',x->>'regras',
   (x->>'preco')::int,x->'comodidades',coalesce(x->'fotos','[]'::jsonb),'analise') returning id into aid;
  return jsonb_build_object('id',aid,'status','analise');
 end if;

 if coalesce(payload->>'id','') !~ '^[0-9a-f-]{36}$' then raise exception 'After inválido.';end if;
 aid:=(payload->>'id')::uuid;
 select * into a from brb_private.afters y where y.id=aid and y.status<>'removido' for update;
 if not found then raise exception 'After não encontrado.';end if;

 if action in ('approve','reject') then
  if not md then raise exception 'Só a equipe Brazilian Bayle analisa anúncios.';end if;
  if a.status<>'analise' then raise exception 'Este anúncio já foi analisado.';end if;
  if action='approve' then
   update brb_private.afters set status='aberto',motivo='',revisado_por=u,revisado_em=now() where id=aid;
  else
   mo:=trim(coalesce(payload->>'motivo',''));
   if length(mo) not between 3 and 200 then raise exception 'Escreva o motivo da recusa (3 a 200 caracteres).';end if;
   update brb_private.afters set status='recusado',motivo=mo,revisado_por=u,revisado_em=now() where id=aid;
  end if;
  insert into brb_private.management_log(actor,action,target) values(u,'after:'||action,aid::text);
  return jsonb_build_object('ok',true);
 end if;

 if action='payout' then
  if not brb_private.is_owner(u) then raise exception 'Só o owner registra repasses.';end if;
  if a.status<>'encerrado' then raise exception 'Repasse só depois do after encerrado.';end if;
  mo:=trim(coalesce(payload->>'reference',''));
  if length(mo) not between 8 and 300 then raise exception 'Informe o comprovante ou identificador do repasse.';end if;
  update brb_private.after_payments set payout_ref=mo,payout_at=now(),payout_by=u where after_id=aid and status='paid' and payout_ref is null;
  if not found then raise exception 'Nada a repassar neste after.';end if;
  insert into brb_private.management_log(actor,action,target) values(u,'after:payout',aid::text);
  return jsonb_build_object('ok',true);
 end if;

 if action='join' then
  if a.status<>'aberto' then raise exception 'Este after não está recebendo pedidos.';end if;
  if a.host=u then raise exception 'Este after é seu.';end if;
  select * into j from brb_private.after_joins y where y.after_id=aid and y.user_id=u for update;
  if found and not (j.status='pagamento' and j.hold_until<=now()) then return jsonb_build_object('status',j.status);end if;
  if a.modo='livre' or found then
   if brb_private.after_taken(aid)>=a.vagas then raise exception 'Este after está lotado.';end if;
   st:=case when a.preco_cents>0 then 'pagamento' else 'confirmado' end;
  else st:='pendente';
  end if;
  insert into brb_private.after_joins(after_id,user_id,status,hold_until) values(aid,u,st,case when st='pagamento' then now()+interval '35 minutes' end)
  on conflict(after_id,user_id) do update set status=excluded.status,hold_until=excluded.hold_until;
  return jsonb_build_object('status',st);
 end if;

 if action='leave' then
  if a.status<>'aberto' then raise exception 'Este after já foi encerrado.';end if;
  if exists(select 1 from brb_private.after_payments y where y.after_id=aid and y.user_id=u and (y.status='paid' or (y.status='pending' and y.provider_id is not null and y.created_at>now()-interval '35 minutes')))
  then raise exception 'Seu ingresso já foi pago ou o Pix está em aberto. Para cancelar, fale com o suporte.';end if;
  delete from brb_private.after_joins y where y.after_id=aid and y.user_id=u and y.status in ('confirmado','pendente','pagamento');
  if not found then raise exception 'Você não está na lista deste after.';end if;
  return jsonb_build_object('ok',true);
 end if;

 if action='decide' then
  if a.host<>u and not brb_private.is_owner(u) then raise exception 'Só o anfitrião decide os pedidos.';end if;
  if a.status<>'aberto' then raise exception 'Este after não está recebendo pedidos.';end if;
  if coalesce(payload->>'uid','') !~ '^[0-9a-f-]{36}$' or payload->>'status' not in ('aprovado','recusado') then raise exception 'Pedido inválido.';end if;
  tid:=(payload->>'uid')::uuid;
  select * into j from brb_private.after_joins y where y.after_id=aid and y.user_id=tid for update;
  if not found or j.status<>'pendente' then raise exception 'Este pedido já foi decidido.';end if;
  if payload->>'status'='aprovado' then
   if brb_private.after_taken(aid)>=a.vagas then raise exception 'Sem vagas livres.';end if;
   -- after pago: aprovado segura a vaga por 24 horas para pagar o Pix
   update brb_private.after_joins set status=case when a.preco_cents>0 then 'pagamento' else 'confirmado' end,
    hold_until=case when a.preco_cents>0 then now()+interval '24 hours' end where after_id=aid and user_id=tid;
  else
   update brb_private.after_joins set status='recusado' where after_id=aid and user_id=tid;
  end if;
  return jsonb_build_object('ok',true);
 end if;

 if action='end' then
  if a.host<>u and not brb_private.is_owner(u) then raise exception 'Só o anfitrião encerra o after.';end if;
  if a.status<>'aberto' then raise exception 'Só dá para encerrar um after que está no ar.';end if;
  update brb_private.afters set status='encerrado' where id=aid;
  return jsonb_build_object('ok',true);
 end if;

 if action='remove' then
  if not brb_private.is_owner(u) and not (a.host=u and a.status in ('analise','recusado')) then raise exception 'Só o owner remove afters.';end if;
  update brb_private.afters set status='removido' where id=aid;
  return jsonb_build_object('ok',true);
 end if;

 if action='rate' then
  if a.status<>'encerrado' then raise exception 'Só dá para avaliar depois que o after for encerrado.';end if;
  if not exists(select 1 from brb_private.after_joins y where y.after_id=aid and y.user_id=u and y.status='confirmado')
  then raise exception 'Só quem foi confirmado no after pode avaliar.';end if;
  if a.host=u then raise exception 'Você não avalia o seu próprio after.';end if;
  if coalesce(payload->>'som','') !~ '^[1-5]$' or coalesce(payload->>'espaco','') !~ '^[1-5]$' or coalesce(payload->>'fraternidade','') !~ '^[1-5]$'
  then raise exception 'Dê uma nota de 1 a 5 em cada item.';end if;
  s1:=(payload->>'som')::int;s2:=(payload->>'espaco')::int;s3:=(payload->>'fraternidade')::int;
  insert into brb_private.after_ratings(after_id,user_id,som,espaco,fraternidade) values(aid,u,s1,s2,s3) on conflict do nothing;
  if not found then raise exception 'Você já avaliou este after.';end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_after(text,jsonb) from public;
grant execute on function public.brb_after(text,jsonb) to anon,authenticated;

-- Mesmo corpo de antes, com claim_mail/finish_mail para a Edge Function drenar a fila de e-mail.
create or replace function public.brb_after_service(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a brb_private.afters; j brb_private.after_joins; p brb_private.after_payments; actor uuid; n int; fee int; outbox jsonb;
begin
 if action='reserve' then
  actor:=(payload->>'actor')::uuid;
  select * into a from brb_private.afters where id=(payload->>'after_id')::uuid for update;
  if a.id is null or a.status<>'aberto' or a.preco_cents<=0 then raise exception 'After indisponível para pagamento.';end if;
  select * into p from brb_private.after_payments where after_id=a.id and user_id=actor and status in ('pending','paid')
   order by created_at desc limit 1;
  if p.id is not null and (p.status='paid' or p.provider_id is null or p.created_at>now()-interval '35 minutes') then
   return jsonb_build_object('payment',to_jsonb(p),'email',p.payer_email,'after',jsonb_build_object('id',a.id,'nome',a.nome,'festa',a.festa));
  end if;
  if p.id is not null then update brb_private.after_payments set status='expired' where id=p.id;end if;
  select * into j from brb_private.after_joins where after_id=a.id and user_id=actor for update;
  if j.status is distinct from 'pagamento' then raise exception 'Peça sua vaga antes de pagar.';end if;
  if j.hold_until<=now() then
   if brb_private.after_taken(a.id)>=a.vagas then raise exception 'Este after lotou enquanto o pagamento esperava.';end if;
   update brb_private.after_joins set hold_until=now()+interval '35 minutes' where after_id=a.id and user_id=actor;
  else
   update brb_private.after_joins set hold_until=greatest(hold_until,now()+interval '35 minutes') where after_id=a.id and user_id=actor;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('after-pay:'||actor::text,0));
  select count(*) into n from brb_private.after_payments where user_id=actor and created_at>now()-interval '1 hour';
  if n>=10 then raise exception 'Aguarde antes de gerar outro pagamento.';end if;
  if payload->>'mode' not in ('test','production') then raise exception 'Cobrança não configurada.';end if;
  fee:=round(a.preco_cents*0.10);
  insert into brb_private.after_payments(after_id,user_id,amount_cents,fee_cents,host_cents,payer_email,mode)
  values(a.id,actor,a.preco_cents+fee,fee,a.preco_cents-fee,(select email from auth.users where id=actor),payload->>'mode') returning * into p;
  return jsonb_build_object('payment',to_jsonb(p),'email',p.payer_email,'after',jsonb_build_object('id',a.id,'nome',a.nome,'festa',a.festa));
 elsif action='context' then
  if payload ? 'payment_id' then
   select * into p from brb_private.after_payments where id=(payload->>'payment_id')::uuid;
  else
   select * into p from brb_private.after_payments where after_id=(payload->>'after_id')::uuid and user_id=(payload->>'actor')::uuid order by created_at desc limit 1;
  end if;
  if p.id is null then return null;end if;
  return jsonb_build_object('payment',to_jsonb(p),'email',p.payer_email);
 elsif action='reconcile' then
  select * into p from brb_private.after_payments where id=(payload->>'payment_id')::uuid for update;
  if p.id is null then raise exception 'Pagamento não encontrado.';end if;
  if p.provider_id is not null and p.provider_id<>payload->>'provider_id' then raise exception 'Provedor divergente.';end if;
  if payload->>'payment_status' not in ('pending','paid','failed','expired','canceled','refunded') then raise exception 'Status inválido.';end if;
  -- eventos antigos não revertem um pagamento acreditado
  if (p.status='refunded' and payload->>'payment_status'='refunded') or (p.status<>'refunded' and (p.status<>'paid' or payload->>'payment_status' in ('paid','refunded'))) then
   update brb_private.after_payments set provider_id=payload->>'provider_id',status=payload->>'payment_status',result=payload->'result' where id=p.id returning * into p;
  end if;
  if p.status='paid' then
   -- pagou, está dentro (mesmo que a vaga segura tenha vencido segundos antes)
   insert into brb_private.after_joins(after_id,user_id,status) values(p.after_id,p.user_id,'confirmado')
   on conflict(after_id,user_id) do update set status='confirmado',hold_until=null;
  elsif p.status='refunded' then
   update brb_private.after_joins set status='reembolsado',hold_until=null where after_id=p.after_id and user_id=p.user_id;
  end if;
  return jsonb_build_object('payment',to_jsonb(p));
 elsif action='claim_mail' then
  with selected as (select m.id from brb_private.after_mail m where m.sent_at is null and (m.claimed_at is null or m.claimed_at<now()-interval '10 minutes') and m.attempts<8 order by m.attempts,m.id for update skip locked limit 10), claimed as (
   update brb_private.after_mail set claimed_at=now(),attempts=attempts+1 where id in(select id from selected) returning *
  ) select jsonb_agg(jsonb_build_object('id',c.id,'after_id',c.after_id,'stage',c.stage,'email',ru.email,
    'after_nome',coalesce(af.nome,'After de @'||coalesce(hp.nick,'')),'solicitante',rp.nick) order by c.id) into outbox
   from claimed c join auth.users ru on ru.id=c.recipient_id join brb_private.afters af on af.id=c.after_id
   left join brb_private.profiles hp on hp.user_id=af.host left join brb_private.profiles rp on rp.user_id=c.user_id;
  return coalesce(outbox,'[]');
 elsif action='finish_mail' then
  update brb_private.after_mail set sent_at=now() where id=(payload->>'mail_id')::uuid;
  return '{}';
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_after_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.brb_after_service(text,jsonb) to service_role;

commit;
