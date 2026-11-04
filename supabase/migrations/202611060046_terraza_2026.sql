-- Festas de 2026 do Terraza Music Park (Florianópolis) com os line-ups publicados no Resident Advisor.
begin;
insert into brb_private.event_catalog(id,event_date,venue,title,lineup,source) values
('terraza-2026-01-02','2026-01-02','Terraza Music Park','Botanic','["Sonja Moonear","Botanic Soundsystem","Criminal Issues","Alaikke"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2319668).'),
('terraza-2026-01-17','2026-01-17','Terraza Music Park','Жronika','["Tessuto","Lucenna","Quadrox","Mat.P"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2327487).'),
('terraza-2026-01-23','2026-01-23','Terraza Music Park','Nick Warren','["Nick Warren","Edu Schwartz","Danee","Anonimat","Ricardo Lin"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2315898).'),
('terraza-2026-01-24','2026-01-24','Terraza Music Park','Gritaria & Duna','["Moses","Joaum","Marc-lo","Caio Castilho"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2352821).'),
('terraza-2026-01-31','2026-01-31','Terraza Music Park','Portal','["Horihana","Bezzi","Raquel Zanella","Ceres Yo"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2352826).'),
('terraza-2026-02-13','2026-02-13','Terraza Music Park','Ian Pooley','["Ian Pooley","Caetano","Moka","Alaikke"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2352828).'),
('terraza-2026-02-16','2026-02-16','Terraza Music Park','Habit','["Aspeckt","Drako","Azhure","Nejoy","Imath"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383614).'),
('terraza-2026-02-28','2026-02-28','Terraza Music Park','Medusa','["Cordini","Asafe","Marian","Vykk","Vicente Schiavenin"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383622).'),
('terraza-2026-03-07','2026-03-07','Terraza Music Park','Trip to Deep','["Julia","FRRANN","Floww","Wonder G"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383630).'),
('terraza-2026-03-14','2026-03-14','Terraza Music Park','D-Edge Tour','["Adnan Sharif","Botanic Soundsystem","Diogo Accioly","Vykk"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383633).'),
('terraza-2026-04-25','2026-04-25','Terraza Music Park','Fabrício Peçanha','["Fabrício Peçanha","Sarah B"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2385042).'),
('terraza-2026-04-30','2026-04-30','Terraza Music Park','DOC Showcase','["Gui Boratto","L_cio","Gabriel Brasil","Ricardo Lin"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383636).'),
('terraza-2026-05-16','2026-05-16','Terraza Music Park','Epicenter Showcase','["Tonaco","Bianco Vargas","Salamoni"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383640).'),
('terraza-2026-05-23','2026-05-23','Terraza Music Park','Жronika 1 Ano','["Vivi An","Edu M","Lucenna","Grey Photon","Mat.P"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487090).'),
('terraza-2026-06-03','2026-06-03','Terraza Music Park','Terraza 14th Anniversary','["Nastia","Ricardo Lin","Lucenna"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2383638).'),
('terraza-2026-06-27','2026-06-27','Terraza Music Park','D-Nox (long set)','["D-Nox","Isadora"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487091).'),
('terraza-2026-07-18','2026-07-18','Terraza Music Park','Habit 4 anos','["Carmee","Anatada","Benicci","GKD","Drakko"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487094).'),
('terraza-2026-07-25','2026-07-25','Terraza Music Park','Bry Ortega Live','["Bry Ortega","Emmy","Konnin","Cau Bartholo"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487095).'),
('terraza-2026-08-08','2026-08-08','Terraza Music Park','Eli Iwasa (long set)','["Eli Iwasa","Ricardo Lin"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487096).'),
('terraza-2026-08-15','2026-08-15','Terraza Music Park','Injeção Eletrônica','["Volkoder","Solare","Ricardo Lin","Alaikke","Greg Santos"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487100).'),
('terraza-2026-08-29','2026-08-29','Terraza Music Park','André Moret','["André Moret","Cordini"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2551286).'),
('terraza-2026-09-05','2026-09-05','Terraza Music Park','Who We Are','["Facundo Mohrr","Hoo","Carmo","Kaala Shaw","Guu"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2551288).'),
('terraza-2026-09-19','2026-09-19','Terraza Music Park','Trip to Deep','["Letícia Stempi","Danee","Hencke"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2487099).'),
('terraza-2026-10-17','2026-10-17','Terraza Music Park','Mihai Popoviciu & Andrey Pushkarev','["Mihai Popoviciu","Andrey Pushkarev","Julia Martinussi","Pedro Losa","Vykk"]'::jsonb,'Resident Advisor, agenda do Terraza Music Park (https://ra.co/events/2551293).')
on conflict(id) do update set title=excluded.title,lineup=excluded.lineup,source=excluded.source;
commit;
