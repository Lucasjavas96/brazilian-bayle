-- Executar em transação com ROLLBACK; nunca deixa usuários, posts ou giros de teste.
do $test$
declare uid uuid:=gen_random_uuid(); oid uuid; pid text:='qa-integrity-'||uid::text; cid uuid; n integer; r jsonb; r2 jsonb; rejected boolean;
begin
 if exists(select 1 from brb_private.event_catalog where source like '%line-up a confirmar%' and jsonb_array_length(lineup)>0) then raise exception 'Line-up genérico ainda liberado';end if;
 insert into auth.users(id,email,email_confirmed_at) values(uid,'qa-'||uid::text||'@example.invalid',now());
 insert into brb_private.profiles(user_id,nick) values(uid,'qa_'||left(replace(uid::text,'-',''),18));
 insert into brb_private.posts(id,owner,title,party,is_demo) values(pid,uid,'QA','QA',true);
 insert into brb_private.comments(post_id,user_id,body) values(pid,uid,'Resenha de teste') returning id into cid;
 select spins into n from brb_private.album_accounts where user_id=uid;
 if n<>11 then raise exception 'Primeiro comentário não creditado: %',n;end if;
 delete from brb_private.comments where id=cid;
 rejected:=false;
 begin insert into brb_private.comments(post_id,user_id,body) values(pid,uid,'Resenha de teste');
 exception when others then if sqlerrm like '%Aguarde%' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Exclusão burlou cooldown';end if;
 update brb_private.comment_activity set last_at=now()-interval '20 seconds' where user_id=uid;
 insert into brb_private.comments(post_id,user_id,body) values(pid,uid,'  RESENHA   de teste  ');
 if (select spins from brb_private.album_accounts where user_id=uid)<>11 then raise exception 'Conteúdo repetido rendeu giro';end if;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 rejected:=false;
 begin perform public.brb_moderation_page('posts','todos');exception when others then if sqlerrm like '%restrito%' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Usuário comum acessou moderação';end if;
 rejected:=false;
 begin perform brb_private.account_vote(jsonb_build_object('party','greenvalley-2026-01-03','dj','Alok','consent',true,'notas',jsonb_build_object('som',10,'harmonia',10,'energia',10,'sofisticacao',10)));
 exception when others then if sqlerrm like '%Apresentação inválida%' then rejected:=true;else raise;end if;end;
 if not rejected then raise exception 'Voto em line-up não confirmado aceito';end if;
 select id into oid from auth.users where brb_private.is_owner(id) limit 1;
 if oid is null then raise exception 'Sem owner confirmado para teste de paginação';end if;
 perform set_config('request.jwt.claim.sub',oid::text,true);
 perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
 for n in 1..26 loop
  insert into brb_private.posts(id,title,party,status,is_demo,created_at) values(pid||'-review-'||lpad(n::text,2,'0'),'QA','QA','review',true,now()+interval '1 day'+n*interval '1 second');
 end loop;
 for n in 1..25 loop
  insert into brb_private.posts(id,title,party,status,is_demo,created_at) values(pid||'-hidden-'||n,'QA','QA','hidden',true,now()+interval '2 days'+n*interval '1 second');
 end loop;
 r:=public.brb_moderation_page('posts','review');
 if jsonb_array_length(r->'items')<>20 then raise exception 'Primeira página inválida';end if;
 if exists(select 1 from jsonb_array_elements(r->'items') x where x->>'status'<>'review') then raise exception 'Filtro não aplicado antes da paginação';end if;
 r2:=public.brb_moderation_page('posts','review',r->'next');
 if not exists(select 1 from jsonb_array_elements(r2->'items') x where x->>'id'=pid||'-review-01') then raise exception 'Pendência antiga inacessível';end if;
 if exists(select 1 from jsonb_array_elements(r->'items') a join jsonb_array_elements(r2->'items') b on a->>'id'=b->>'id') then raise exception 'Paginação duplicou itens';end if;
end $test$;
