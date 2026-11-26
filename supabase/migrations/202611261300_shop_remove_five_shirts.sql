begin;
update public.brb_shop_products set active=false
where id in ('01-work-it','03-vintage-culture','06-techno-addict','14-thay3','16-thay9');
update public.brb_shop_products set name='Techno Addict' where id='13-papagaio-neon';
commit;
