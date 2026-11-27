begin;
update public.brb_shop_products set active=false where id='10-a-pista-e-brasileira';
update public.brb_shop_products set active=true where id in ('01-work-it','03-vintage-culture','06-techno-addict','14-thay3','16-thay9');
update public.brb_shop_products set name='Techno Addict · Papagaio clássico' where id='06-techno-addict';
update public.brb_shop_products set name='Techno Addict · Papagaio neon' where id='13-papagaio-neon';
insert into public.brb_shop_products(id,name,price_cents,sizes,active) values
('22-vintage-clube-john','Vintage Clube John',14990,array['P','M','G','GG','XG'],true),
('23-cropped-afterparty','Professional Afterparty Princess',3990,array['P','M','G','GG'],true)
on conflict(id) do update set active=true;
commit;
