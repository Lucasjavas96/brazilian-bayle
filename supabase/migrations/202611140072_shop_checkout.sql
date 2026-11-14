-- Checkout: prices and order state are server-controlled. No browser table access.
create table public.brb_shop_products(id text primary key,name text not null,price_cents integer check(price_cents>0),sizes text[] not null default '{}',active boolean not null default false);
create table public.brb_shop_orders(id uuid primary key,secret_hash text not null,customer jsonb not null,items jsonb not null,subtotal_cents integer not null check(subtotal_cents>0),shipping_cents integer not null check(shipping_cents>=0),total_cents integer not null check(total_cents=subtotal_cents+shipping_cents),mode text not null check(mode in('test','production')),status text not null default 'created',ip_hash text not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '15 minutes');
create table public.brb_shop_attempts(id uuid primary key,order_id uuid not null references public.brb_shop_orders(id),fingerprint text not null,status text not null default 'pending',provider_id text unique,result jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index brb_shop_orders_ip_time on public.brb_shop_orders(ip_hash,created_at);
alter table public.brb_shop_products enable row level security;
alter table public.brb_shop_orders enable row level security;
alter table public.brb_shop_attempts enable row level security;
revoke all on public.brb_shop_products,public.brb_shop_orders,public.brb_shop_attempts from anon,authenticated,public;
grant all on public.brb_shop_products,public.brb_shop_orders,public.brb_shop_attempts to service_role;
create or replace function public.brb_shop_reserve_attempt(p_order uuid,p_attempt uuid,p_fingerprint text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o brb_shop_orders; a brb_shop_attempts;begin
 select * into o from brb_shop_orders where id=p_order for update;
 if not found then raise exception 'order_missing';end if;
 select * into a from brb_shop_attempts where id=p_attempt;
 if found then if a.order_id<>p_order or a.fingerprint<>p_fingerprint then raise exception 'attempt_conflict';end if;return to_jsonb(a);end if;
 if o.status='paid' or exists(select 1 from brb_shop_attempts where order_id=p_order and status not in('failed','canceled','expired')) then raise exception 'payment_pending';end if;
 if o.expires_at<now() then raise exception 'quote_expired';end if;
 insert into brb_shop_attempts(id,order_id,fingerprint) values(p_attempt,p_order,p_fingerprint) returning * into a;return to_jsonb(a);
end $$;
revoke all on function public.brb_shop_reserve_attempt(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.brb_shop_reserve_attempt(uuid,uuid,text) to service_role;
insert into public.brb_shop_products(id,name) values
('01-work-it','Work It Harder'),('02-make-djs-mix-again','Make DJs Mix Again'),('03-vintage-culture','Vintage Culture'),('04-546-im-yours','5:46 · I’m Yours'),('05-que-festa-boa','Que Festa Boa'),('06-techno-addict','Techno Addict'),('07-keep-following','Keep Following the Bayle') on conflict do nothing;

-- Price authorized by the merchant; sizes from Hotprinti's standard oversized catalog.
update public.brb_shop_products set price_cents=14990,sizes=array['P','M','G','GG','XG'],active=true;
