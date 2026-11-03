-- Festas do fim de semana de 30/10 a 01/11 (D-EDGE SP, Club Vibe, Ame Club, P12 e Parque Villa-Lobos) com os line-ups informados.
begin;
insert into brb_private.event_catalog(id,event_date,venue,title,lineup,source) values
('d-edge-sao-paulo-2026-10-30','2026-10-30','D-EDGE São Paulo','Freak Chic','["Viot","Sterium","Goes","Halfcab"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('d-edge-sao-paulo-2026-10-31','2026-10-31','D-EDGE São Paulo','Unlimited D EDGE','["Carla Elektra","Leticia Stempi","Malu","Solare","Carol Favero","Raiza Koh Sante","Mary Gripa","Stormyx","Ekanta","Carbon C","Paola Vigorito","Lary Lima"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('club-vibe-2026-10-30','2026-10-30','Club Vibe','Illusionize','["Illusionize"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('club-vibe-2026-10-31','2026-10-31','Club Vibe','Gabss + Solarce Brothers','["Gabss","Solarce Brothers"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('ame-club-2026-11-01','2026-11-01','Ame Club','Nora En Pure + Einmusik','["Nora En Pure","Einmusik","Gui Boratto","Corren Cavini","Leff"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('p12-2026-11-01','2026-11-01','P12','Jessica Brankka + Miss Natalia','["Jessica Brankka","Miss Natalia","Tiago Kuhnen"]'::jsonb,'Line-up informado pela Brazilian Bayle.'),
('parque-villa-lobos-2026-11-01','2026-11-01','Parque Villa-Lobos','Solomun + Vintage Culture','["Solomun","Vintage Culture","Curol","Analu"]'::jsonb,'Line-up informado pela Brazilian Bayle.')
on conflict(id) do update set event_date=excluded.event_date,venue=excluded.venue,title=excluded.title,lineup=excluded.lineup,source=excluded.source;
commit;
