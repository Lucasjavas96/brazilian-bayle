insert into public.brb_shop_products(id,name,price_cents,sizes,active) values
('20-cropped-sorry','Sorry, I only date DJs',3990,array['P','M','G','GG'],true),
('21-cropped-techno','Girls just wanna have techno',3990,array['P','M','G','GG'],true)
on conflict(id) do update set name=excluded.name,price_cents=excluded.price_cents,sizes=excluded.sizes,active=excluded.active;
