-- Álbum: Vintage Culture volta a Lendária com OVR 92 (decisão do Lucas, 04/11/2026). Ficam 9 lendárias.
begin;
insert into brb_private.album_catalog(slug,card) values
('vintage-culture','{"slug":"vintage-culture","nome":"Vintage Culture","num":"BRA 02","flag":"br","paisNome":"Brasil","genero":"House","tag":"HOUSE","bpm":"122–126","rank":"DJ MAG #10","foto":"/assets/album/fotos/vintage-culture.webp","pos":"center 12%","zoom":"","origin":"","texto":"De Mundo Novo (MS) para o top 10 do mundo. Dono do selo Só Track Boa.","faixa":"Drinkee (Vintage Culture & John Summit Remix)","ovr":92,"attrs":{"SOM":98,"HAR":82,"ENE":93,"SOF":85,"HYP":97,"LEG":92},"cls":"lendaria","rar":"Lendária"}'::jsonb)
on conflict (slug) do update set card=excluded.card;
commit;