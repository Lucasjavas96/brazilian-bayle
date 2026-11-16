begin;

-- Snapshot financeiro por pedido. A cobrança permanece desativada até configurar
-- explicitamente quem paga a taxa e as credenciais da intermediação.
create table brb_private.ticket_payments (
 request_id uuid primary key references brb_private.ticket_requests(id),
 amount_cents integer not null check(amount_cents>0),
 fee_cents integer not null check(fee_cents>=0),
 seller_cents integer not null check(seller_cents>0),
 payer_email text not null,
 check(amount_cents - seller_cents = 2 * fee_cents),
 mode text not null check(mode in ('test','production')),
 provider_id text unique,
 status text not null default 'pending',
 result jsonb,
 created_at timestamptz not null default now()
);
create table brb_private.ticket_evidence (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references brb_private.ticket_requests(id),
 actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('sent','received','disputed','payout')),
 reference text not null check(length(reference) between 8 and 1500),
 object_path text,
 created_at timestamptz not null default now(),
 unique(request_id,kind)
);
create table brb_private.ticket_mail (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references brb_private.ticket_requests(id),
 recipient_id uuid not null references auth.users(id),
 stage text not null,
 sent_at timestamptz,
 claimed_at timestamptz,
 attempts integer not null default 0,
 unique(request_id,recipient_id,stage)
);
alter table brb_private.ticket_payments enable row level security;
alter table brb_private.ticket_evidence enable row level security;
alter table brb_private.ticket_mail enable row level security;
revoke all on brb_private.ticket_payments,brb_private.ticket_evidence,brb_private.ticket_mail from public,anon,authenticated;

alter table brb_private.ticket_requests drop constraint ticket_requests_status_check;
alter table brb_private.ticket_requests add constraint ticket_requests_status_check
 check(status in ('solicitada','pagamento_confirmado','ingresso_transferido','recebimento_confirmado','em_disputa','concluida','cancelada','reembolsada'));
alter table brb_private.ticket_requests add column proof_uploads smallint not null default 0 check(proof_uploads between 0 and 8);

create function brb_private.ticket_queue_mail() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.status is distinct from old.status then
  insert into brb_private.ticket_mail(request_id,recipient_id,stage)
  select new.id,x.id,new.status from (
   select new.buyer_id id union select seller_id from brb_private.ticket_listings where id=new.listing_id
  ) x on conflict do nothing;
 end if;
 return new;
end $$;
create trigger ticket_queue_mail after insert or update of status on brb_private.ticket_requests
for each row execute function brb_private.ticket_queue_mail();

-- As funções públicas existentes continuam criando anúncios e reservas.
-- Pagamento e avanço de etapa passam a obedecer a confirmação do provedor.
alter function public.brb_tickets_admin(text,jsonb) rename to brb_tickets_admin_legacy;
revoke all on function public.brb_tickets_admin_legacy(text,jsonb) from public,anon,authenticated;
create function public.brb_tickets_admin(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r brb_private.ticket_requests; ref text:=trim(coalesce(payload->>'reference',''));begin
 if auth.uid() is null or not brb_private.is_owner(auth.uid()) then raise exception 'Acesso restrito.';end if;
 if action='advance' then
  select * into r from brb_private.ticket_requests where id=(payload->>'id')::uuid for update;
  if not found then raise exception 'Pedido não encontrado.';end if;
  if payload->>'status'='concluida' and r.status='recebimento_confirmado' then
   if length(ref)<8 or length(ref)>1500 then raise exception 'Informe o comprovante ou identificador do repasse realizado.';end if;
   insert into brb_private.ticket_evidence(request_id,actor_id,kind,reference) values(r.id,auth.uid(),'payout',ref);
   update brb_private.ticket_requests set status='concluida',updated_at=now() where id=r.id;
   update brb_private.ticket_listings set status='concluido' where id=r.listing_id;
  elsif payload->>'status'='cancelada' and r.status='solicitada'
    and not exists(select 1 from brb_private.ticket_payments where request_id=r.id) then
   update brb_private.ticket_requests set status='cancelada',updated_at=now() where id=r.id;
   update brb_private.ticket_listings set status='ativo' where id=r.listing_id;
  else raise exception 'Pagamento é confirmado pelo Mercado Pago. Confira a etapa e os comprovantes do pedido.';end if;
 elsif action<>'list' then raise exception 'Ação inválida.';end if;
 return jsonb_build_object('requests',coalesce((select jsonb_agg((item - 'fee') || jsonb_build_object(
  'evidence',coalesce((select jsonb_agg(jsonb_build_object('kind',v.kind,'reference',v.reference)) from brb_private.ticket_evidence v where v.request_id=(item->>'id')::uuid),'[]'),
  'payment',coalesce((select jsonb_build_object('status',p.status,'amount_cents',p.amount_cents,'fee_cents',p.fee_cents,'seller_cents',p.seller_cents) from brb_private.ticket_payments p where p.request_id=(item->>'id')::uuid),'{}')
  )) from jsonb_array_elements(public.brb_tickets_admin_legacy('list','{}')->'requests') item),'[]'));
end $$;
revoke all on function public.brb_tickets_admin(text,jsonb) from public,anon;
grant execute on function public.brb_tickets_admin(text,jsonb) to authenticated;

create function public.brb_ticket_journey(action text,payload jsonb default '{}'::jsonb) returns jsonb
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
  'delivery_email',case when u=t.seller_id and q.status in ('pagamento_confirmado','ingresso_transferido','recebimento_confirmado','concluida','em_disputa') then (select email from auth.users where id=q.buyer_id) else null end,
  'created_at',q.created_at,'payment_status',p.status,'amount_cents',p.amount_cents,'fee_cents',p.fee_cents,'seller_cents',p.seller_cents,
  'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'kind',v.kind,'reference',v.reference,'has_file',v.object_path is not null,'created_at',v.created_at) order by v.created_at) from brb_private.ticket_evidence v where v.request_id=q.id),'[]')
 ) order by q.created_at desc)
 from brb_private.ticket_requests q join brb_private.ticket_listings t on t.id=q.listing_id
 join brb_private.interest_events e on e.id=t.event_id left join brb_private.ticket_payments p on p.request_id=q.id
 where (q.buyer_id=u or t.seller_id=u or (action='get' and brb_private.is_owner(u))) and (action='list' or q.id=(payload->>'id')::uuid)),'[]');
end $$;
revoke all on function public.brb_ticket_journey(text,jsonb) from public,anon;
grant execute on function public.brb_ticket_journey(text,jsonb) to authenticated;

-- Serviço financeiro: somente a Edge Function pode consultar dados de cobrança.
create function public.brb_ticket_service(action text,payload jsonb default '{}'::jsonb) returns jsonb
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
  ) select jsonb_agg(jsonb_build_object('id',c.id,'request_id',c.request_id,'stage',c.stage,'email',u.email,'event',e.title)) into outbox from claimed c join auth.users u on u.id=c.recipient_id join brb_private.ticket_requests q on q.id=c.request_id join brb_private.ticket_listings t on t.id=q.listing_id join brb_private.interest_events e on e.id=t.event_id;
  return coalesce(outbox,'[]');
 elsif action='finish_mail' then
  update brb_private.ticket_mail set sent_at=now() where id=(payload->>'mail_id')::uuid;
  return '{}';
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_ticket_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.brb_ticket_service(text,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brb-ticket-evidence','brb-ticket-evidence',false,5242880,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
commit;
