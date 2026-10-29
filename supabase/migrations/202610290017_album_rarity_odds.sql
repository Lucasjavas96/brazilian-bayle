-- Álbum: chance de drop por raridade, decidida pelo Lucas em 29/10/2026.
-- O giro sorteia primeiro a raridade (Comum 70%, Rara 20%, Épica 8%, Lendária 2%) e depois uma carta ativa dentro dela.
-- Raridade sem carta ativa sai da conta e o peso dela se redistribui. Só troca a linha do sorteio; o resto do brb_album fica igual.
begin;
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_album(text,jsonb)'::regprocedure) into definition;
  before:=definition;
  if position($a$select slug into picked from brb_private.album_catalog where active order by random() limit 1;$a$ in definition)=0 then raise exception 'brb_album: linha do sorteio não encontrada';end if;
  definition:=replace(definition,$a$select slug into picked from brb_private.album_catalog where active order by random() limit 1;$a$,
$b$with w(cls,peso) as (values('comum',70),('rara',20),('epica',8),('lendaria',2)),
    av as (select w.cls,w.peso from w where exists(select 1 from brb_private.album_catalog c where c.active and c.card->>'cls'=w.cls)),
    acc as (select av.cls,sum(av.peso) over (order by av.peso desc,av.cls) as ate,sum(av.peso) over () as total from av),
    sorte as (select random() as x),
    raridade as (select acc.cls from acc,sorte where sorte.x*acc.total<acc.ate order by acc.ate limit 1)
   select c.slug into picked from brb_private.album_catalog c join raridade r on c.card->>'cls'=r.cls where c.active order by random() limit 1;$b$);
  if definition=before then raise exception 'brb_album: nada mudou';end if;
  execute definition;
end $mig$;
commit;