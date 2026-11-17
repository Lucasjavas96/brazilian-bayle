-- Onde é o after?: anúncio moderado, nome, saída da lista e ingresso pago.
-- Concatenar depois da migração 202611170076, antes de ROLLBACK. Nenhum dado é mantido.
do $t$ declare h uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); m uuid:=gen_random_uuid(); aid uuid; pid uuid; r jsonb; ok boolean;
 base jsonb:='{"nome":"Rooftop","festa":"BB","bairro":"Centro","endereco":"Rua X, 10","hora":"Dom · 04h00","vagas":"1","modo":"livre","comodidades":["som","piscina"]}';
begin
 insert into auth.users(id,email,email_confirmed_at) values(h,'after-h-'||h||'@example.invalid',now()),(g,'after-g-'||g||'@example.invalid',now()),(m,'after-m-'||m||'@example.invalid',now());
 insert into brb_private.profiles(user_id,nick) values(h,'th'||substr(h::text,1,8)),(g,'tg'||substr(g::text,1,8)),(m,'tm'||substr(m::text,1,8));
 insert into brb_private.staff(user_id) values(m);
 -- qualquer conta anuncia; entra em análise e não aparece para o público
 perform set_config('request.jwt.claim.sub',h::text,true);
 ok:=false; begin perform public.brb_after('create',base-'nome');exception when others then ok:=true;end;
 if not ok then raise exception 'criou sem nome';end if;
 ok:=false; begin perform public.brb_after('create',base||'{"comodidades":["jacuzzi"]}');exception when others then ok:=true;end;
 if not ok then raise exception 'comodidade livre aceita';end if;
 r:=public.brb_after('create',base); aid:=(r->>'id')::uuid;
 if r->>'status'<>'analise' then raise exception 'não entrou em análise';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);
 if exists(select 1 from jsonb_array_elements(public.brb_after('list','{}')->'items') i where i->>'id'=aid::text) then raise exception 'anúncio em análise visível';end if;
 ok:=false; begin perform public.brb_after('approve',jsonb_build_object('id',aid));exception when others then ok:=true;end;
 if not ok then raise exception 'conta comum aprovou';end if;
 -- equipe recusa, anfitrião corrige, volta para análise, equipe aprova
 perform set_config('request.jwt.claim.sub',m::text,true);
 if not (public.brb_after('list','{}')->>'me_mod')::boolean then raise exception 'staff sem me_mod';end if;
 perform public.brb_after('reject',jsonb_build_object('id',aid,'motivo','Foto sem o lugar'));
 perform set_config('request.jwt.claim.sub',h::text,true);
 perform public.brb_after_edit(base||jsonb_build_object('id',aid,'nome','Casa Batel'));
 if (select status from brb_private.afters where id=aid)<>'analise' then raise exception 'correção não voltou à análise';end if;
 perform set_config('request.jwt.claim.sub',m::text,true);
 perform public.brb_after('approve',jsonb_build_object('id',aid));
 -- gratuito: entra, endereço liberado, sai e libera vaga
 perform set_config('request.jwt.claim.sub',g::text,true);
 r:=public.brb_after('join',jsonb_build_object('id',aid)); if r->>'status'<>'confirmado' then raise exception 'join livre';end if;
 r:=public.brb_after('list','{}'); if (select i->>'endereco' from jsonb_array_elements(r->'items') i where i->>'id'=aid::text)<>'Rua X, 10' then raise exception 'endereço não liberado';end if;
 perform public.brb_after('leave',jsonb_build_object('id',aid));
 if brb_private.after_taken(aid)<>0 then raise exception 'vaga não liberada';end if;
 -- pago: vaga segura, Pix pago confirma, não sai sozinho
 perform set_config('request.jwt.claim.sub',h::text,true);
 perform public.brb_after_edit(base||jsonb_build_object('id',aid,'preco_cents','4000'));
 perform set_config('request.jwt.claim.sub',g::text,true);
 r:=public.brb_after('join',jsonb_build_object('id',aid)); if r->>'status'<>'pagamento' then raise exception 'join pago %',r;end if;
 if brb_private.after_taken(aid)<>1 then raise exception 'vaga não segurada';end if;
 r:=public.brb_after_service('reserve',jsonb_build_object('after_id',aid,'actor',g,'mode','test'));
 if (r#>>'{payment,amount_cents}')::int<>4400 or (r#>>'{payment,host_cents}')::int<>3600 then raise exception 'taxa errada %',r;end if;
 pid:=(r#>>'{payment,id}')::uuid;
 if (public.brb_after_service('reserve',jsonb_build_object('after_id',aid,'actor',g,'mode','test'))#>>'{payment,id}')::uuid<>pid then raise exception 'reserva duplicou';end if;
 perform public.brb_after_service('reconcile',jsonb_build_object('payment_id',pid,'provider_id','ORD1','payment_status','paid','result','{}'::jsonb));
 if (select status from brb_private.after_joins where after_id=aid and user_id=g)<>'confirmado' then raise exception 'pago não confirmou';end if;
 perform public.brb_after_service('reconcile',jsonb_build_object('payment_id',pid,'provider_id','ORD1','payment_status','pending','result','{}'::jsonb));
 if (select status from brb_private.after_payments where id=pid)<>'paid' then raise exception 'evento antigo reverteu';end if;
 ok:=false; begin perform public.brb_after('leave',jsonb_build_object('id',aid));exception when others then ok:=true;end;
 if not ok then raise exception 'saiu com ingresso pago';end if;
 -- repasse: só owner e só depois de encerrado
 perform set_config('request.jwt.claim.sub',h::text,true);
 r:=public.brb_after('list','{}'); if (select (i#>>'{vendas,total_host_cents}')::int from jsonb_array_elements(r->'items') i where i->>'id'=aid::text)<>3600 then raise exception 'vendas %',r;end if;
 ok:=false; begin perform public.brb_after_edit(base||jsonb_build_object('id',aid,'preco_cents','5000'));exception when others then ok:=true;end;
 if not ok then raise exception 'preço mudou com gente paga';end if;
 perform public.brb_after('end',jsonb_build_object('id',aid));
 raise notice 'after_journey OK';
end $t$;
