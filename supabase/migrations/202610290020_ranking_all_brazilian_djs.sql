-- Ranking: passa a valer todos os DJs brasileiros da DJ Pédia (57), não só os 20 iniciais.
-- Só amplia a lista de DJs aceitos na avaliação; o resto da função é igual ao da migração 202610240010.
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
 or (payload->>'dj') is null or (payload->>'dj')<>all(array['Alok','Vintage Culture','Mochakk','ANNA','Liu','Cat Dealers','Dubdogz','KVSH','Bhaskar','Chemical Surf','Zerb','Öwnboss','RUBACK','Victor Ruiz','Gui Boratto','Illusionize','Beltran','Mojjo','Classmatic','GREG','Fancy Inc','Felguk','Antdot','Rooftime','Binaryh','Elekfantz','L_cio','Patife','Leo Janeiro','Breaking Beattz','Gabe','JetLag Music','Shapeless','Eli Iwasa','Bruno Be','Mau Mau','Sevek','Bruno Martini','Victor Lou','Pontifexx','Wehbba','Selvagem','Tropkillaz','DJ Marky','Anderson Noise','Groove Delight','Renato Ratier','Mila Journée','Ney Faustini','Renato Cohen','Vinne','Volkoder','Dashdot','Maz','Malifoo','Greggio','GenX']) then
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
commit;
