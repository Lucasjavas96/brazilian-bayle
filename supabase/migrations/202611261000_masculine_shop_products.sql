insert into public.brb_shop_products(id,name,price_cents,sizes,active)
select p.id,p.name,base.price_cents,base.sizes,base.active
from (values ('10-a-pista-e-brasileira','A pista é brasileira'),
('11-thay5','Track ID: Unknown'),
('12-thay8','See You on the Dance Floor'),
('13-papagaio-neon','Papagaio Neon · Techno Addict'),
('14-thay3','Posso dançar só mais essa?'),
('15-thay6','Lost in the Groove'),
('16-thay9','I Want Your Soul'),
('17-thay1','Sorry, I’m Nonverbal Right Now'),
('18-thay2','The Last Romantic')) as p(id,name)
cross join public.brb_shop_products base
where base.id='01-work-it'
on conflict(id) do nothing;
