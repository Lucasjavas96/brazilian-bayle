create table brb_private.event_catalog(id text primary key,event_date date not null,venue text not null,title text not null,lineup jsonb not null,source text not null);
alter table brb_private.event_catalog enable row level security;
revoke all on brb_private.event_catalog from public,anon,authenticated;
insert into brb_private.event_catalog(id,event_date,venue,title,lineup,source) values
('p12-2026-01-09','2026-01-09','P12','Meet Day: Adam Sellouk','["Adam Sellouk"]'::jsonb,'https://www.ingresse.com/meet-day-adam-sellouk-p12-jurere/'),
('warung-2026-01-17','2026-01-17','Warung','Deep Dish Day Party','["Deep Dish", "Phonique", "Diogo Accioly", "Sarah Stenzel", "LRB", "Thibes&Pa"]'::jsonb,'https://warungclub.com.br/agenda-antigas/'),
('warung-2026-02-13','2026-02-13','Warung','Carnaval 2026','["Richie Hawtin", "Julian Fijma", "Albuquerque", "Aninha", "Tarter", "Laguna Sound Department", "Foletto"]'::jsonb,'https://warungclub.com.br/agenda-antigas/'),
('greenvalley-2026-02-14','2026-02-14','Greenvalley','Carnaval com Vintage Culture','["Vintage Culture", "OMRI", "Doozie"]'::jsonb,'https://www.guicheweb.com.br/carnaval-com-vintage-culture-no-greenvalley_47387'),
('warung-2026-02-14','2026-02-14','Warung','Carnaval','["D-Nox", "Malive", "HOO"]'::jsonb,'https://warungclub.com.br/agenda-antigas/'),
('surreal-park-2026-02-15','2026-02-15','Surreal Park','Carnaval Surreal','["Jamie Jones", "Beltran", "Seth Troxler", "Ratier", "BAPP", "Miss Monique", "DJ Murphy", "Nezello", "Adria", "Ray", "[a:rpia:r]", "Botanic Soundsystem"]'::jsonb,'https://www.ingresse.com/15-fev-carnaval-surreal/'),
('matahari-2026-03-28','2026-03-28','Matahari','Opening 2026','[]'::jsonb,'https://linktr.ee/matahari'),
('warung-2026-04-04','2026-04-04','Warung','Mano Le Tough','["Mano Le Tough", "Curol", "Conti&Mandi"]'::jsonb,'https://warungclub.com.br/agenda/'),
('warung-2026-04-18','2026-04-18','Warung','Laurent Garnier','["Laurent Garnier", "Eli Iwasa", "DJ Mau Mau"]'::jsonb,'https://warungclub.com.br/agenda/'),
('greenvalley-2026-05-02','2026-05-02','Greenvalley','Alok no Greenvalley','["Alok"]'::jsonb,'https://www.guicheweb.com.br/alok-no-greenvalley_50120'),
('warung-2026-05-02','2026-05-02','Warung','Warung Day Festival','["Chambord", "Charlotte de Witte", "Deep Dish", "Desiree", "Enrico Sangiuliano", "Guy Gerber", "Guy J", "Monolink", "Antonio Oliva", "Badaro", "Beltran", "Bhaskar", "Blancah", "Eli Iwasa", "Enrico&Carmo", "Fran Bortolossi", "Malive", "Neoclassic", "Rod Brito", "RUBACK", "ZAC"]'::jsonb,'https://warungclub.com.br/agenda/'),
('matahari-2026-05-23','2026-05-23','Matahari','Matahari Music Festival','[]'::jsonb,'https://linktr.ee/matahari'),
('warung-2026-06-04','2026-06-04','Warung','Closing Weekend — Vintage Culture','["Vintage Culture", "Antdot", "Albuquerque", "Nezello"]'::jsonb,'https://warungclub.com.br/agenda/'),
('warung-2026-06-05','2026-06-05','Warung','Closing Weekend — Dixon','["Dixon", "Boghosian", "Blancah", "Leoz", "Conti&Mandi"]'::jsonb,'https://warungclub.com.br/agenda/'),
('warung-2026-06-06','2026-06-06','Warung','Closing Weekend — Hernan Cattaneo','["Hernan Cattaneo", "Ezequiel Arias", "Edu Schwartz", "Fran Bortolossi"]'::jsonb,'https://warungclub.com.br/agenda/'),
('matahari-2026-07-11','2026-07-11','Matahari','Winter Festival','[]'::jsonb,'https://linktr.ee/matahari'),
('greenvalley-2026-07-18','2026-07-18','Greenvalley','Winter Music 2026','[]'::jsonb,'https://www.guicheweb.com.br/greenvalley-winter-music-2026_52122'),
('ame-club-2026-07-25','2026-07-25','Ame Club','ANNA all night long','["ANNA"]'::jsonb,'https://www.ingresse.com/ame-club-apresenta-anna/'),
('matahari-2026-08-29','2026-08-29','Matahari','Aniversário 16 anos','[]'::jsonb,'https://linktr.ee/matahari'),
('p12-2026-09-06','2026-09-06','P12','Goodtimes by Illusionize','["Illusionize"]'::jsonb,'https://p12.ingresse.com/'),
('matahari-2026-10-03','2026-10-03','Matahari','Oktobertronic','[]'::jsonb,'https://linktr.ee/matahari'),
('d-edge-rio-2026-10-16','2026-10-16','D-EDGE Rio','Victor Lou','["Victor Lou"]'::jsonb,'https://www.blueticket.com.br/evento/42012/d-edge-rio-apresenta-victor-lou'),
('laroc-2026-10-17','2026-10-17','Laroc','Rave The World by Alok','["Alok", "Solara"]'::jsonb,'https://www.ingresse.com/laroc-club-apresenta-rave-the-world-by-alok/'),
('club-vibe-2026-10-23','2026-10-23','Club Vibe','Liu','["Liu"]'::jsonb,'https://www.blueticket.com.br/evento/41491'),
('d-edge-sao-paulo-2026-10-23','2026-10-23','D-EDGE São Paulo','Freak Chic','["Dimmish", "Adnan Sharif", "Bauhouse"]'::jsonb,'https://site.blueticket.com.br/evento/41985/freak-chic-d-edge-sp-pres-p1-dimmish-adnan-sharif-bauhouse');
-- Replace only the old hardcoded event/artist guard, preserving the rest of the
-- validation and existing submissions. Fail closed if implementation has drifted.
do $update$
declare definition text;old_guard text;
begin
 select pg_get_functiondef('brb_private.action_core(text,jsonb)'::regprocedure) into definition;
 old_guard:=substring(definition from 'if coalesce\(\(\(\(payload->>''party''[\s\S]*?Apresentação inválida\.'';end if;');
 if old_guard is null then
  old_guard:=substring(definition from 'if coalesce\(\(\(payload->>''party''[\s\S]*?Apresentação inválida\.'';end if;');
 end if;
 if old_guard is null then raise exception 'Event guard not found; inspect backend before updating';end if;
 definition:=replace(definition,old_guard,$guard$if not exists(select 1 from brb_private.event_catalog e where e.id=payload->>'party' and e.event_date<=current_date and e.lineup ? (payload->>'dj') and (payload->>'dj')=any(array['Alok','Vintage Culture','Mochakk','ANNA','Liu','Cat Dealers','Dubdogz','KVSH','Bhaskar','Chemical Surf','Zerb','Öwnboss','RUBACK','Victor Ruiz','Gui Boratto','Illusionize','Beltran','Mojjo','Classmatic','GREG'])) then raise exception 'Apresentação inválida.';end if;$guard$);
 execute definition;
end $update$;
