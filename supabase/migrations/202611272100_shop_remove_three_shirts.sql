begin;
update public.brb_shop_products set active=false
where id in ('03-vintage-culture','06-techno-addict','14-thay3');
commit;
