-- Todo DJ que toca na pista brasileira pode ser avaliado: sai a lista fixa de DJs brasileiros da função de avaliação.
-- Continua valendo só quem consta no line-up de uma festa já realizada (event_catalog). O resto da função é igual ao da migração 202611030024.
begin;
create or replace function brb_private.account_vote(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); nick text; k text;
begin
 if u is null then raise exception 'Entre na sua conta para avaliar um DJ.'; end if;
 if not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Confirme seu e-mail para avaliar.'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>16000 then raise exception 'Dados inválidos.';end if;
 if (payload->'consent') is distinct from 'true'::jsonb then raise exception 'Confirme o consentimento.';end if;
 select p.nick into nick from brb_private.profiles p where p.user_id=u;
 if nick is null then raise exception 'Complete seu nickname nas configurações da conta.';end if;
 if not exists(select 1 from brb_private.event_catalog e where e.id=payload->>'party' and e.event_date<=current_date and e.lineup ? (payload->>'dj'))
 or nullif(trim(coalesce(payload->>'dj','')),'') is null then
  raise exception 'Apresentação inválida.';
 end if;
 foreach k in array array['som','harmonia','energia','sofisticacao'] loop
  if jsonb_typeof(payload->'notas'->k) is distinct from 'number' then raise exception 'Avalie os quatro critérios.';end if;
  if (payload->'notas'->>k)::numeric not between 0 and 10 then raise exception 'Notas entre zero e dez.';end if;
 end loop;
 if length(coalesce(payload->>'comment',''))>1000 then raise exception 'Comentário muito longo.';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vote'||u::text,0));
 if exists(select 1 from brb_private.submissions where kind='vote' and identity=u::text and created_at>now()-interval '30 seconds') then raise exception 'Aguarde alguns segundos antes de enviar novamente.';end if;
 insert into brb_private.submissions(kind,identity,payload) values('vote',u::text,jsonb_build_object('party',payload->>'party','dj',payload->>'dj','user_id',u,'nick',nick,'notas',payload->'notas','comment',payload->>'comment','verified_weight',1,'is_demo',true,'consent_at',now()));
 return jsonb_build_object('ok',true);
exception when unique_violation then raise exception 'Você já avaliou este DJ nesta festa.';
end $$;
revoke all on function brb_private.account_vote(jsonb) from public,anon,authenticated;

-- Os line-ups do banco passam a ser os mesmos do site (festas já realizadas com line-up informado), agora com DJs estrangeiros.
update brb_private.event_catalog set lineup='["Adam Sellouk"]'::jsonb where id='p12-2026-01-09';
update brb_private.event_catalog set lineup='["Vintage Culture"]'::jsonb where id='greenvalley-2026-01-17';
update brb_private.event_catalog set lineup='["Deep Dish","Phonique","Diogo Accioly","Sarah Stenzel","LRB","Thibes&Pa"]'::jsonb where id='warung-2026-01-17';
update brb_private.event_catalog set lineup='["Richie Hawtin","Julian Fijma","Albuquerque","Aninha","Tarter","Laguna Sound Department","Foletto"]'::jsonb where id='warung-2026-02-13';
update brb_private.event_catalog set lineup='["Vintage Culture","OMRI","Doozie"]'::jsonb where id='greenvalley-2026-02-14';
update brb_private.event_catalog set lineup='["D-Nox","Malive","HOO"]'::jsonb where id='warung-2026-02-14';
update brb_private.event_catalog set lineup='["Jamie Jones","Beltran","Seth Troxler","Ratier","BAPP","Miss Monique","DJ Murphy","Nezello","Adria","Ray","[a:rpia:r]","Botanic Soundsystem"]'::jsonb where id='surreal-park-2026-02-15';
update brb_private.event_catalog set lineup='["Mochakk"]'::jsonb where id='surreal-park-2026-04-03';
update brb_private.event_catalog set lineup='["Mano Le Tough","Curol","Conti&Mandi"]'::jsonb where id='warung-2026-04-04';
update brb_private.event_catalog set lineup='["Laurent Garnier","Eli Iwasa","DJ Mau Mau"]'::jsonb where id='warung-2026-04-18';
update brb_private.event_catalog set lineup='["Alok"]'::jsonb where id='greenvalley-2026-05-02';
update brb_private.event_catalog set lineup='["Chambord","Charlotte de Witte","Deep Dish","Desiree","Enrico Sangiuliano","Guy Gerber","Guy J","Monolink","Antonio Oliva","Badaro","Beltran","Bhaskar","Blancah","Eli Iwasa","Enrico&Carmo","Fran Bortolossi","Malive","Neoclassic","Rod Brito","RUBACK","ZAC"]'::jsonb where id='warung-2026-05-02';
update brb_private.event_catalog set lineup='["Illusionize"]'::jsonb where id='surreal-park-2026-05-16';
update brb_private.event_catalog set lineup='["Vintage Culture","Antdot","Albuquerque","Nezello"]'::jsonb where id='warung-2026-06-04';
update brb_private.event_catalog set lineup='["Dixon","Boghosian","Blancah","Leoz","Conti&Mandi"]'::jsonb where id='warung-2026-06-05';
update brb_private.event_catalog set lineup='["Hernan Cattaneo","Ezequiel Arias","Edu Schwartz","Fran Bortolossi"]'::jsonb where id='warung-2026-06-06';
update brb_private.event_catalog set lineup='["ANNA"]'::jsonb where id='ame-club-2026-07-25';
update brb_private.event_catalog set lineup='["Illusionize"]'::jsonb where id='p12-2026-09-06';
update brb_private.event_catalog set lineup='["Victor Lou"]'::jsonb where id='d-edge-rio-2026-10-16';
update brb_private.event_catalog set lineup='["Alok","Solara"]'::jsonb where id='laroc-2026-10-17';
update brb_private.event_catalog set lineup='["Liu"]'::jsonb where id='club-vibe-2026-10-23';
update brb_private.event_catalog set lineup='["Dimmish","Adnan Sharif","Bauhouse"]'::jsonb where id='d-edge-sao-paulo-2026-10-23';
update brb_private.event_catalog set lineup='["Solomun","Vintage Culture","Doozie","Albuquerque"]'::jsonb where id='pedreira-2026-10-31';
update brb_private.event_catalog set lineup='["Beltran","Ben Sterling","Analu","gggguerra","Simas"]'::jsonb where id='surreal-park-2026-11-01';
commit;
