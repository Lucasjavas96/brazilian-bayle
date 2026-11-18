-- Intermediação de ingressos: o tipo passa a cruzar gênero (Masculino/Feminino/Unissex) com a
-- categoria (Meia social/Backstage/Pista/Área VIP). Os valores antigos continuam válidos para os
-- anúncios já cadastrados; os novos anúncios usam "<categoria> <gênero>".
begin;

do $$
declare cname text;
begin
 select conname into cname from pg_constraint
  where conrelid='brb_private.ticket_listings'::regclass and contype='c'
    and pg_get_constraintdef(oid) like '%ticket_type%';
 if cname is not null then
  execute format('alter table brb_private.ticket_listings drop constraint %I', cname);
 end if;
end $$;
alter table brb_private.ticket_listings add constraint ticket_listings_ticket_type_check
 check(normalize(ticket_type,nfc) in (
  normalize('Masculino',nfc),normalize('Feminino',nfc),normalize('Meia social',nfc),normalize('Backstage',nfc),normalize('Pista',nfc),normalize('Área VIP',nfc),
  normalize('Meia social Masculino',nfc),normalize('Meia social Feminino',nfc),normalize('Meia social Unissex',nfc),
  normalize('Backstage Masculino',nfc),normalize('Backstage Feminino',nfc),normalize('Backstage Unissex',nfc),
  normalize('Pista Masculino',nfc),normalize('Pista Feminino',nfc),normalize('Pista Unissex',nfc),
  normalize('Área VIP Masculino',nfc),normalize('Área VIP Feminino',nfc),normalize('Área VIP Unissex',nfc)
 ));

create or replace function public.brb_tickets(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); ok boolean; ev text:=payload->>'event'; ty text:=payload->>'type'; pr numeric; lid uuid; n integer;
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
  perform 1 from brb_private.ticket_listings l where l.id=lid and l.status='ativo' and l.seller_id<>u for update;
  if not found then raise exception 'Esse ingresso não está mais disponível.';end if;
  insert into brb_private.ticket_requests(listing_id,buyer_id) values(lid,u);
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

commit;
