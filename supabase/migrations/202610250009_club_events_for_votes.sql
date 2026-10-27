-- Festas do Green Valley e do Surreal Park que o menu do Spotted e a avaliação de DJs passam a compartilhar.
-- Só entram as que têm um DJ do ranking como headliner (a avaliação exige DJ do ranking e festa já realizada).
-- Datas futuras ficam cadastradas e só aceitam voto a partir do dia (a regra current_date já existe no servidor).
begin;
insert into brb_private.event_catalog(id,event_date,venue,title,lineup,source) values
('greenvalley-2026-01-17','2026-01-17','Greenvalley','Vintage Culture (Arena Open)','["Vintage Culture"]'::jsonb,'Agenda do clube informada pela Brazilian Bayle (só o headliner)'),
('greenvalley-2026-12-30','2026-12-30','Greenvalley','Vintage Culture (Arena Open)','["Vintage Culture"]'::jsonb,'Agenda do clube informada pela Brazilian Bayle (só o headliner)'),
('surreal-park-2026-04-03','2026-04-03','Surreal Park','Mochakk','["Mochakk"]'::jsonb,'Agenda do clube informada pela Brazilian Bayle (só o headliner)'),
('surreal-park-2026-05-16','2026-05-16','Surreal Park','Illusionize Saturn','["Illusionize"]'::jsonb,'Agenda do clube informada pela Brazilian Bayle (só o headliner)'),
('surreal-park-2026-11-01','2026-11-01','Surreal Park','Beltran','["Beltran"]'::jsonb,'Agenda do clube informada pela Brazilian Bayle (só o headliner)')
on conflict(id) do nothing;
commit;
