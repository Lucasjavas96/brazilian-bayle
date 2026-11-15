alter table public.brb_shop_orders add column if not exists shipping_service text check (shipping_service in ('PAC', 'SEDEX'));
