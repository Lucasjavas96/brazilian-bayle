-- Intermediação de ingressos (P2P): anúncios de ingresso e pedidos de intermediação, sempre conduzidos pelo suporte.
-- Fluxo: solicitada -> pagamento_confirmado (suporte recebeu do comprador) -> ingresso_transferido (vendedor transferiu) -> concluida (suporte repassou ao vendedor).
-- Taxa da intermediação: 5% do valor do ingresso (calculada na tela e na fila do suporte).
begin;

create table brb_private.ticket_listings(
 id uuid primary key default gen_random_uuid(),
 event_id text not null references brb_private.interest_events(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 ticket_type text not null check(ticket_type in ('Masculino','Feminino','Meia social','Backstage','Pista','Área VIP')),
 price numeric(10,2) not null check(price>=1 and price<=50000),
 status text not null default 'ativo' check(status in ('ativo','em_intermediacao','concluido','cancelado')),
 created_at timestamptz not null default now()
);
create index ticket_listings_event on brb_private.ticket_listings(event_id,status);
create index ticket_listings_seller on brb_private.ticket_listings(seller_id);
alter table brb_private.ticket_listings enable row level security;
revoke all on brb_private.ticket_listings from public,anon,authenticated;

create table brb_private.ticket_requests(
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references brb_private.ticket_listings(id) on delete cascade,
 buyer_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'solicitada' check(status in ('solicitada','pagamento_confirmado','ingresso_transferido','concluida','cancelada')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index ticket_requests_one_open on brb_private.ticket_requests(listing_id) where status not in ('cancelada');
alter table brb_private.ticket_requests enable row level security;
revoke all on brb_private.ticket_requests from public,anon,authenticated;

create or replace function public.brb_tickets(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); ok boolean; ev text:=payload->>'event'; ty text:=payload->>'type'; pr numeric; lid uuid; n integer;
begin
 ok:=u is not null and exists(select 1 from auth.users x where x.id=u and x.email_confirmed_at is not null);
 if action in('create','cancel','request') and not ok then return jsonb_build_object('login',false);end if;
 if action='create' then
  begin pr:=round((payload->>'price')::numeric,2); exception when others then raise exception 'Informe o valor do ingresso.'; end;
  if pr is null or pr<1 or pr>50000 then raise exception 'O valor do ingresso deve ficar entre R$ 1 e R$ 50.000.';end if;
  if ty is null or ty not in ('Masculino','Feminino','Meia social','Backstage','Pista','Área VIP') then raise exception 'Escolha o tipo do ingresso.';end if;
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

-- fila do suporte (só owner)
create or replace function public.brb_tickets_admin(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rid uuid; st text; cur text; lid uuid;
begin
 if u is null or not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if action='advance' then
  rid:=(payload->>'id')::uuid; st:=payload->>'status';
  select r.status,r.listing_id into cur,lid from brb_private.ticket_requests r where r.id=rid for update;
  if cur is null then raise exception 'Pedido não encontrado.';end if;
  if not ((cur='solicitada' and st in('pagamento_confirmado','cancelada')) or (cur='pagamento_confirmado' and st in('ingresso_transferido','cancelada')) or (cur='ingresso_transferido' and st in('concluida','cancelada'))) then raise exception 'Passo inválido para esse pedido.';end if;
  update brb_private.ticket_requests r set status=st,updated_at=now() where r.id=rid;
  if st='concluida' then update brb_private.ticket_listings l set status='concluido' where l.id=lid;
  elsif st='cancelada' then update brb_private.ticket_listings l set status='ativo' where l.id=lid;
  end if;
 elsif action<>'list' then raise exception 'Ação inválida.';
 end if;
 return jsonb_build_object('requests',coalesce((select jsonb_agg(jsonb_build_object(
   'id',r.id,'status',r.status,'created_at',r.created_at,'updated_at',r.updated_at,
   'event',e.title,'event_date',e.event_date,'venue',e.venue,'type',l.ticket_type,'price',l.price,'fee',round(l.price*0.05,2),
   'seller_nick',sp.nick,'seller_email',su.email,'buyer_nick',bp.nick,'buyer_email',bu.email) order by r.created_at desc)
  from brb_private.ticket_requests r
  join brb_private.ticket_listings l on l.id=r.listing_id
  join brb_private.interest_events e on e.id=l.event_id
  join auth.users su on su.id=l.seller_id left join brb_private.profiles sp on sp.user_id=l.seller_id
  join auth.users bu on bu.id=r.buyer_id left join brb_private.profiles bp on bp.user_id=r.buyer_id),'[]'::jsonb));
end $$;
revoke all on function public.brb_tickets_admin(text,jsonb) from public,anon;
grant execute on function public.brb_tickets_admin(text,jsonb) to authenticated;
commit;
