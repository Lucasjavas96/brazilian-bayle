-- Álbum: nova figurinha no catálogo (Greggio). Só acrescenta ou atualiza o cartão por slug.
begin;
insert into brb_private.album_catalog(slug,card) values
('greggio','{"slug":"greggio","nome":"Greggio","num":"BRA 57","flag":"br","paisNome":"Brasil","genero":"Tech House","tag":"HOUSE","bpm":"124–128","rank":"CENA BR","foto":"/assets/album/fotos/greggio.webp","pos":"center 25%","zoom":"","origin":"","texto":"Mineiro de Juiz de Fora radicado em Londres, lançou pela Diynamic, de Solomun, e levou um EP ao topo de lançamentos do Beatport.","faixa":"Oldskool Flavor","ovr":69,"attrs":{"SOM":80,"HAR":66,"ENE":82,"SOF":66,"HYP":60,"LEG":62},"cls":"comum","rar":"Comum"}'::jsonb)
on conflict (slug) do update set card=excluded.card;
commit;