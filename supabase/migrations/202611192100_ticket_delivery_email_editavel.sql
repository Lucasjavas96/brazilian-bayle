-- Intermediação: o comprador passa a ver e poder corrigir o e-mail de entrega direto na
-- página do pedido (antes de pagar ou enquanto aguarda a transferência), em vez de só na
-- hora da reserva. Nova ação 'delivery_email' em brb_ticket_journey.
begin;

create or replace function public.brb_ticket_journey(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r brb_private.ticket_requests; l brb_private.ticket_listings; ref text:=trim(coalesce(payload->>'reference','')); obj text:=payload->>'object_path'; de text;begin
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
  elsif action='delivery_email' then
   if u<>r.buyer_id then raise exception 'Ação restrita ao comprador.';end if;
   if r.status not in ('solicitada','pagamento_confirmado') then raise exception 'Não é mais possível alterar o e-mail de destino.';end if;
   de:=trim(coalesce(payload->>'delivery_email',''));
   if de='' or de !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(de)>254 then raise exception 'Informe um e-mail válido.';end if;
   update brb_private.ticket_requests set delivery_email=de where id=r.id;
  elsif action<>'get' then raise exception 'Ação inválida.';end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',q.id,'status',q.status,'event',e.title,'date',e.event_date,'venue',e.venue,'type',t.ticket_type,'price',t.price,
  'role',case when q.buyer_id=u then 'buyer' when t.seller_id=u then 'seller' else 'staff' end,
  'delivery_email',case when u=q.buyer_id then q.delivery_email
   when u=t.seller_id and q.status in ('pagamento_confirmado','ingresso_transferido','recebimento_confirmado','concluida','em_disputa') then coalesce(q.delivery_email,(select email from auth.users where id=q.buyer_id))
   else null end,
  'created_at',q.created_at,'payment_status',p.status,'amount_cents',p.amount_cents,'fee_cents',p.fee_cents,'seller_cents',p.seller_cents,
  'evidence',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'kind',v.kind,'reference',v.reference,'has_file',v.object_path is not null,'created_at',v.created_at) order by v.created_at) from brb_private.ticket_evidence v where v.request_id=q.id),'[]')
 ) order by q.created_at desc)
 from brb_private.ticket_requests q join brb_private.ticket_listings t on t.id=q.listing_id
 join brb_private.interest_events e on e.id=t.event_id left join brb_private.ticket_payments p on p.request_id=q.id
 where (q.buyer_id=u or t.seller_id=u or (action='get' and brb_private.is_owner(u))) and (action='list' or q.id=(payload->>'id')::uuid)),'[]');
end $$;
revoke all on function public.brb_ticket_journey(text,jsonb) from public,anon;
grant execute on function public.brb_ticket_journey(text,jsonb) to authenticated;

commit;
