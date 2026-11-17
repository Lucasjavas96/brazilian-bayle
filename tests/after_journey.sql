-- Onde é o after?: nome do after e 'leave'. Concatenar depois da migração 202611170076, antes de ROLLBACK. Nenhum dado é mantido.
do $t$ declare h uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); aid uuid; r jsonb; ok boolean;
begin
 insert into auth.users values(h,'h@x',now()),(g,'g@x',now());
 insert into brb_private.profiles values(h,'host'),(g,'guest');
 insert into brb_private.submissions values('h@x','application','approved');
 perform set_config('request.jwt.claim.sub',h::text,true);
 ok:=false; begin perform public.brb_after('create','{"festa":"BB","bairro":"Centro","endereco":"Rua X, 10","hora":"Dom · 04h00","vagas":"2","modo":"aprovacao"}');exception when others then ok:=true;end;
 if not ok then raise exception 'criou sem nome';end if;
 r:=public.brb_after('create','{"nome":"Rooftop","festa":"BB","bairro":"Centro","endereco":"Rua X, 10","hora":"Dom · 04h00","vagas":"2","modo":"aprovacao"}'); aid:=(r->>'id')::uuid;
 perform set_config('request.jwt.claim.sub',g::text,true);
 r:=public.brb_after('list','{}'); if r#>>'{items,0,nome}'<>'Rooftop' or r#>'{items,0,endereco}'<>'null'::jsonb then raise exception 'list %',r;end if;
 r:=public.brb_after('join',jsonb_build_object('id',aid)); if r->>'status'<>'pendente' then raise exception 'join';end if;
 perform public.brb_after('leave',jsonb_build_object('id',aid));
 if exists(select 1 from brb_private.after_joins) then raise exception 'leave';end if;
 ok:=false; begin perform public.brb_after('leave',jsonb_build_object('id',aid));exception when others then ok:=true;end; if not ok then raise exception 'leave 2x';end if;
 perform public.brb_after('join',jsonb_build_object('id',aid));
 perform set_config('request.jwt.claim.sub',h::text,true);
 perform public.brb_after('decide',jsonb_build_object('id',aid,'uid',g,'status','aprovado'));
 perform public.brb_after_edit(jsonb_build_object('id',aid,'nome','Casa Batel','festa','BB','bairro','Batel','endereco','Rua Y, 2','hora','Dom · 05h00','vagas','2','modo','livre'));
 perform set_config('request.jwt.claim.sub',g::text,true);
 r:=public.brb_after('list','{}'); if r#>>'{items,0,nome}'<>'Casa Batel' or r#>>'{items,0,endereco}'<>'Rua Y, 2' or r#>>'{items,0,ocupadas}'<>'1' then raise exception 'list2 %',r;end if;
 perform public.brb_after('leave',jsonb_build_object('id',aid));
 r:=public.brb_after('list','{}'); if r#>>'{items,0,ocupadas}'<>'0' then raise exception 'vaga';end if;
 raise notice 'OK';
end $t$;
