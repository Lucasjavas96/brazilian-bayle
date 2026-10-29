-- Álbum: OVR fixado pelo Lucas (29/10/2026) para 6 lendárias: Boris Brejcha 96, Alok 94, Solomun 94, Carl Cox 93,
-- Vintage Culture 92 e David Guetta 92. O conjunto das lendárias passa a somar 1% do sorteio; o 1% liberado vai para Comum.
begin;
insert into brb_private.album_catalog(slug,card) values
('boris-brejcha','{"slug":"boris-brejcha","nome":"Boris Brejcha","num":"ALE 05","flag":"de","paisNome":"Alemanha","genero":"High-Tech Minimal","tag":"TECHNO","bpm":"122–128","rank":"DJ MAG #57","foto":"/assets/album/fotos/boris-brejcha.webp","pos":"46% center","zoom":"","origin":"","texto":"Dono do selo Fckng Serious e da máscara de Joker, rosto do High-Tech Minimal.","faixa":"Purple Noise","ovr":96,"attrs":{"SOM":70,"HAR":66,"ENE":66,"SOF":71,"HYP":84,"LEG":87},"cls":"lendaria","rar":"Lendária"}'::jsonb),
('alok','{"slug":"alok","nome":"Alok","num":"BRA 01","flag":"br","paisNome":"Brasil","genero":"Brazilian Bass / House","tag":"BASS","bpm":"124–126","rank":"DJ MAG #4","foto":"/assets/album/fotos/alok.webp","pos":"center 25%","zoom":"","origin":"","texto":"Filho de pioneiros do psytrance, levou o Brazilian Bass ao mundo e é o #4 do DJ Mag em 2026.","faixa":"Hear Me Now","ovr":94,"attrs":{"SOM":95,"HAR":66,"ENE":89,"SOF":89,"HYP":97,"LEG":95},"cls":"lendaria","rar":"Lendária"}'::jsonb),
('solomun','{"slug":"solomun","nome":"Solomun","num":"RDM 05","flag":"ba","paisNome":"Bósnia","genero":"Melodic House","tag":"HOUSE","bpm":"120–124","rank":"DJ MAG #41","foto":"/assets/album/fotos/solomun.webp","pos":"center 25%","zoom":"","origin":"","texto":"Fundou o selo Diynamic em 2005 e toca no Pacha Ibiza com a festa Solomun +1.","faixa":"Friends","ovr":94,"attrs":{"SOM":70,"HAR":72,"ENE":82,"SOF":81,"HYP":87,"LEG":88},"cls":"lendaria","rar":"Lendária"}'::jsonb),
('carl-cox','{"slug":"carl-cox","nome":"Carl Cox","num":"ING 02","flag":"gb-eng","paisNome":"Inglaterra","genero":"Techno / House","tag":"TECHNO","bpm":"125–132","rank":"DJ MAG #23","foto":"/assets/album/fotos/carl-cox.webp","pos":"48% center","zoom":"","origin":"","texto":"Três decks, um sorriso do tamanho da pista e 15 anos de residência no Space Ibiza.","faixa":"I Want You (Forever)","ovr":93,"attrs":{"SOM":70,"HAR":99,"ENE":85,"SOF":99,"HYP":90,"LEG":99},"cls":"lendaria","rar":"Lendária"}'::jsonb),
('vintage-culture','{"slug":"vintage-culture","nome":"Vintage Culture","num":"BRA 02","flag":"br","paisNome":"Brasil","genero":"House","tag":"HOUSE","bpm":"122–126","rank":"DJ MAG #10","foto":"/assets/album/fotos/vintage-culture.webp","pos":"center 12%","zoom":"","origin":"","texto":"De Mundo Novo (MS) para o top 10 do mundo. Dono do selo Só Track Boa.","faixa":"Drinkee (Vintage Culture & John Summit Remix)","ovr":92,"attrs":{"SOM":94,"HAR":78,"ENE":89,"SOF":81,"HYP":93,"LEG":88},"cls":"lendaria","rar":"Lendária"}'::jsonb),
('david-guetta','{"slug":"david-guetta","nome":"David Guetta","num":"FRA 01","flag":"fr","paisNome":"França","genero":"EDM / House","tag":"EDM","bpm":"124–130","rank":"DJ MAG #1","foto":"/assets/album/fotos/david-guetta.webp","pos":"center 25%","zoom":"","origin":"","texto":"Número 1 do DJ Mag Top 100 2026, maior nome da dance music francesa.","faixa":"Titanium","ovr":92,"attrs":{"SOM":70,"HAR":66,"ENE":74,"SOF":66,"HYP":99,"LEG":96},"cls":"lendaria","rar":"Lendária"}'::jsonb)
on conflict (slug) do update set card=excluded.card;
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_album(text,jsonb)'::regprocedure) into definition;
  before:=definition;
  if position($a$values('comum',70),('rara',20),('epica',8),('lendaria',2)$a$ in definition)=0 then raise exception 'brb_album: pesos não encontrados';end if;
  definition:=replace(definition,$a$values('comum',70),('rara',20),('epica',8),('lendaria',2)$a$,$b$values('comum',71),('rara',20),('epica',8),('lendaria',1)$b$);
  if definition=before then raise exception 'brb_album: nada mudou';end if;
  execute definition;
end $mig$;
commit;