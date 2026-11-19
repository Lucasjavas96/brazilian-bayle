-- Intermediação: o comprador escolhe o e-mail de destino da transferência na hora de
-- reservar (antes caía sempre no e-mail da conta). Os avisos automáticos por etapa
-- passam a carregar o papel do destinatário (comprador ou vendedor), para a Edge
-- Function usar um texto específico por papel e, no aviso de pagamento confirmado ao
-- vendedor, citar o e-mail de destino direto no corpo da mensagem.
begin;

alter table brb_private.ticket_requests add column delivery_email text
 check(delivery_email is null or delivery_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create or replace function public.brb_tickets(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); ok boolean; ev text:=payload->>'event'; ty text:=payload->>'type'; pr numeric; lid uuid; n integer; de text;
begin
 ok:=u is not null and exists(select 1 from auth.users x where x.id=u and x.email_confirmed_at is not null);
 if action in('create','cancel','request') and not ok then return jsonb_build_object('login',false);end if;
 if action='create' then
  begin pr:=round((payload->>'price')::numeric,2); exception when others then raise exception 'Informe o valor do ingresso.'; end;
  if pr is null or pr<1 or pr>50000 then raise exception 'O valor do ingresso deve ficar entre R$ 1 e R$ 50.000.';end if;
  if ty is null or normalize(ty,nfc) not in (
   normalize('Masculino',nfc),normalize('Feminino',nfc),normalize('Meia social',nfc),normalize('Backstage',nfc),normalize('Pista',nfc),normalize('Área VIP',nfc),
   normalize('Meia social Masculino',nfc),normalize('Meia social Feminino',nfc),normalize('Meia social Unissex',nfc),
   normalize('Backstage Masculino',nfc),normalize('Backstage Feminino',nfc),normalize('Backstage Unissex',nfc),
   normalize('Pista Masculino',nfc),normalize('Pista Feminino',nfc),normalize('Pista Unissex',nfc),
   normalize('Área VIP Masculino',nfc),normalize('Área VIP Feminino',nfc),normalize('Área VIP Unissex',nfc)
  ) then raise exception 'Escolha o gênero e a categoria do ingresso.';end if;
  if not exists(select 1 from brb_private.interest_events e where e.id=ev and e.event_date>=current_date) then raise exception 'Essa festa não está disponível.';end if;
  select count(*) into n from brb_private.ticket_listings l where l.seller_id=u and l.event_id=ev and l.status in('ativo','em_intermediacao');
  if n>=5 then raise exception 'Você já tem 5 anúncios para essa festa.';end if;
  insert into brb_private.ticket_listings(event_id,seller_id,ticket_type,price) values(ev,u,ty,pr);
 elsif action='cancel' then
  update brb_private.ticket_listings l set status='cancelado' where l.id=(payload->>'id')::uuid and l.seller_id=u and l.status='ativo';
 elsif action='request' then
  lid:=(payload->>'id')::uuid;
  de:=trim(coalesce(payload->>'delivery_email',''));
  if de='' or de !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(de)>254 then raise exception 'Informe um e-mail válido para receber o ingresso.';end if;
  perform 1 from brb_private.ticket_listings l where l.id=lid and l.status='ativo' and l.seller_id<>u for update;
  if not found then raise exception 'Esse ingresso não está mais disponível.';end if;
  insert into brb_private.ticket_requests(listing_id,buyer_id,delivery_email) values(lid,u,de);
  update brb_private.ticket_listings l set status='em_intermediacao' where l.id=lid;
 elsif action<>'list' then raise exception 'Ação inválida.';
 end if;
 return jsonb_build_object('login',ok,
  'listings',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'event',l.event_id,'type',l.ticket_type,'price',l.price,'status',l.status,'nick',p.nick,'mine',l.seller_id=u) order by l.created_at desc)
    from brb_private.ticket_listings l left join brb_private.profiles p on p.user_id=l.seller_id
    where l.status in('ativo','em_intermediacao') and l.event_id in(select e.id from brb_private.interest_events e where e.event_date>=current_date)),'[]'::jsonb),
  'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'listing',r.listing_id,'status',r.status) order by r.created_at desc) from brb_private.ticket_requests r where u is not null and r.buyer_id=u),'[]'::jsonb));
end $$;
revoke all on function public.brb_tickets(text,jsonb) from public;
grant execute on function public.brb_tickets(text,jsonb) to anon,authenticated;

create or replace function public.brb_ticket_journey(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r brb_private.ticket_requests; l brb_private.ticket_listings; ref text:=trim(coalesce(payload->>'reference','')); obj text:=payload->>'object_path';begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Entre com uma conta de e-mail confirmado.';end if;
 if action<>'list' then
  select * into r from brb_private.ticket_requests where id=(payload->>'id')::uuid for update;
  select * into l from brb_private.ticket_listings where id=r.listing_id;
  if r.id is null or (u<>r.buyer_id and u<>l.seller_id and not brb_private.is_owner(u)) then raise exception 'Pedido não encontrado.';end if;
  if action in ('sent','received','disputed') then
   if length(ref)<8 or length(ref)>1500 then raise exception 'Descreva a confirmação em 8 a 1500 caracteres.';end if;
   if action='sent' and (u<>l.seller_id or r.status<>'pagamento_confirmado') then raise exception 'Aguarde a confirmação do pagamento para transferir.';end if;
   if action='received' and (u<>r.buyer_id or r.status<>'ingresso_transferido') then raise exception 'Aguarde o envio do ingresso.';end if;
   if action='disputed' and u not in(r.buyer_id,l.seller_id) then raise exception 'Ação restrita às partes.';end if;
   if action='disputed' and r.status not in ('pagamento_confirmado','ingresso_transferido','recebimento_confirmado') then raise exception 'Não é possível abrir uma ocorrência nesta etapa.';end if;
   if action='sent' then
    if obj is null or not exists(select 1 from storage.objects where bucket_id='brb-ticket-evidence' and name=obj and name like r.id::text||'/'||u::text||'/%') then raise exception 'Anexe o comprovante da transferência.';end if;
   elsif obj is not null then raise exception 'Anexo inválido.';end if;
   insert into brb_private.ticket_evidence(request_id,actor_id,kind,reference,object_path) values(r.id,u,action,ref,obj);
   update brb_private.ticket_requests set status=case action when 'sent' then 'ingresso_transferido' when 'received' then 'recebimento_confirmado' else 'em_disputa' end,updated_at=now() where id=r.id;
  elsif action='cancel' then
   if r.status<>'solicitada' or exists(select 1 from brb_private.ticket_payments where request_id=r.id and status not in ('expired','failed','canceled')) then raise exception 'Pagamento iniciado. Aguarde sua confirmação ou expiração.';end if;
   update brb_private.ticket_requests set status='cancelada',updated_at=now() where id=r.id;
   update brb_private.ticket_listings set status='ativo' where id=l.id;
  elsif action<>'get' then raise exception 'Ação inválida.';end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',q.id,'status',q.status,'event',e.title,'date',e.event_date,'venue',e.venue,'type',t.ticket_type,'price',t.price,
  'role',case when q.buyer_id=u then 'buyer' when t.seller_id=u then 'seller' else 'staff' end,
  'delivery_email',case when u=t.seller_id and q.status in ('pagamento_confirmado','ingresso_transferido','recebimento_confirmado','concluida','em_disputa') then coalesce(q.delivery_email,(select email from auth.users where id=q.buyer_id)) else null end,
  'created_at',q.created_at,'payment_status',p.status,'amount_cents',p.amount_cents,'fee_cents',p.fee_cents,'seller_cents',p.seller_cents,
  'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'kind',v.kind,'reference',v.reference,'has_file',v.object_path is not null,'created_at',v.created_at) order by v.created_at) from brb_private.ticket_evidence v where v.request_id=q.id),'[]')
 ) order by q.created_at desc)
 from brb_private.ticket_requests q join brb_private.ticket_listings t on t.id=q.listing_id
 join brb_private.interest_events e on e.id=t.event_id left join brb_private.ticket_payments p on p.request_id=q.id
 where (q.buyer_id=u or t.seller_id=u or (action='get' and brb_private.is_owner(u))) and (action='list' or q.id=(payload->>'id')::uuid)),'[]');
end $$;
revoke all on function public.brb_ticket_journey(text,jsonb) from public,anon;
grant execute on function public.brb_ticket_journey(text,jsonb) to authenticated;

create or replace function public.brb_ticket_service(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r brb_private.ticket_requests; l brb_private.ticket_listings; p brb_private.ticket_payments; n integer; amount integer; fee integer; outbox jsonb;begin
 if action in ('context','reserve','reconcile','evidence','upload') then
  select * into r from brb_private.ticket_requests where id=(payload->>'id')::uuid for update;
  select * into l from brb_private.ticket_listings where id=r.listing_id;
  if r.id is null then raise exception 'Pedido não encontrado.';end if;
  if action<>'reconcile' and coalesce((payload->>'actor')::uuid not in(r.buyer_id,l.seller_id),true) and not coalesce(action='context' and payload->>'webhook'='true',false) and not coalesce(brb_private.is_owner((payload->>'actor')::uuid),false) then raise exception 'Pedido não encontrado.';end if;
  select * into p from brb_private.ticket_payments where request_id=r.id;
  if action='reserve' then
   if (payload->>'actor')::uuid<>r.buyer_id or r.status<>'solicitada' then raise exception 'Pedido indisponível para pagamento.';end if;
   if p.request_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(r.buyer_id::text,0));
    select count(*) into n from brb_private.ticket_payments x join brb_private.ticket_requests y on y.id=x.request_id where y.buyer_id=r.buyer_id and x.created_at>now()-interval '1 hour';
    if n>=10 then raise exception 'Aguarde antes de gerar outro pagamento.';end if;
    if payload->>'mode' not in ('test','production') then raise exception 'Cobrança não configurada.';end if;
    amount:=round(l.price*100);fee:=round(amount*0.10);
    insert into brb_private.ticket_payments(request_id,amount_cents,fee_cents,seller_cents,payer_email,mode)
    values(r.id,amount+fee,fee,amount-fee,(select email from auth.users where id=r.buyer_id),payload->>'mode') returning * into p;
   end if;
  elsif action='reconcile' then
   if p.request_id is null then raise exception 'Pagamento não encontrado.';end if;
   if p.provider_id is not null and p.provider_id<>payload->>'provider_id' then raise exception 'Provedor divergente.';end if;
   if payload->>'payment_status' not in ('pending','paid','failed','expired','canceled','refunded') then raise exception 'Status inválido.';end if;
   -- Eventos antigos não revertem um pagamento acreditado.
   if (p.status='refunded' and payload->>'payment_status'='refunded') or (p.status<>'refunded' and (p.status<>'paid' or payload->>'payment_status' in ('paid','refunded'))) then
    update brb_private.ticket_payments set provider_id=payload->>'provider_id',status=payload->>'payment_status',result=payload->'result' where request_id=r.id returning * into p;
   end if;
   if p.status='paid' and r.status='solicitada' then
    update brb_private.ticket_requests set status='pagamento_confirmado',updated_at=now() where id=r.id returning * into r;
   elsif p.status='refunded' and r.status='concluida' then
    update brb_private.ticket_requests set status='em_disputa',updated_at=now() where id=r.id returning * into r;
   elsif p.status='refunded' and r.status<>'reembolsada' then
    update brb_private.ticket_requests set status='reembolsada',updated_at=now() where id=r.id returning * into r;
    update brb_private.ticket_listings set status='cancelado' where id=l.id;
   end if;
  elsif action='upload' then
   if (payload->>'actor')::uuid<>l.seller_id or r.status<>'pagamento_confirmado' or r.proof_uploads>=8 then raise exception 'Envio indisponível. Consulte a etapa ou fale com o suporte.';end if;
   update brb_private.ticket_requests set proof_uploads=proof_uploads+1 where id=r.id;
  elsif action='evidence' then
   return (select jsonb_build_object('path',object_path) from brb_private.ticket_evidence where id=(payload->>'evidence_id')::uuid and request_id=r.id);
  end if;
  return jsonb_build_object('request',to_jsonb(r),'listing',to_jsonb(l),'payment',case when p.request_id is null then null else to_jsonb(p) end,'email',coalesce(p.payer_email,(select email from auth.users where id=r.buyer_id)));
 elsif action='claim_mail' then
  with selected as (select m.id from brb_private.ticket_mail m where m.sent_at is null and (m.claimed_at is null or m.claimed_at<now()-interval '10 minutes') and m.attempts<8 order by m.attempts,m.id for update skip locked limit 10), claimed as (
   update brb_private.ticket_mail set claimed_at=now(),attempts=attempts+1 where id in(select id from selected) returning *
  ) select jsonb_agg(jsonb_build_object('id',c.id,'request_id',c.request_id,'stage',c.stage,'email',u.email,'event',e.title,
    'role',case when c.recipient_id=q.buyer_id then 'buyer' else 'seller' end,
    'delivery_email',coalesce(q.delivery_email,(select email from auth.users where id=q.buyer_id))
   )) into outbox from claimed c join auth.users u on u.id=c.recipient_id join brb_private.ticket_requests q on q.id=c.request_id join brb_private.ticket_listings t on t.id=q.listing_id join brb_private.interest_events e on e.id=t.event_id;
  return coalesce(outbox,'[]');
 elsif action='finish_mail' then
  update brb_private.ticket_mail set sent_at=now() where id=(payload->>'mail_id')::uuid;
  return '{}';
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_ticket_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.brb_ticket_service(text,jsonb) to service_role;

commit;
