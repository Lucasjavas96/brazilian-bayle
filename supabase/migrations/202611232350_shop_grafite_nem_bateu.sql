insert into public.brb_shop_products (id, name, price_cents, sizes, active)
select new_product.id, new_product.name, existing.price_cents, existing.sizes, existing.active
from public.brb_shop_products existing
cross join (values ('08-grafite', 'Grafite'), ('09-nem-bateu', 'Nem Bateu')) as new_product(id, name)
where existing.id = '03-vintage-culture'
on conflict (id) do nothing;
