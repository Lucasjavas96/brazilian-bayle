-- Concatenar depois da migração, antes de ROLLBACK. Nenhum dado é mantido.
do $test$
declare seller uuid:=gen_random_uuid(); buyer uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); owner_id uuid;
 lid uuid; rid uuid; ev text; a jsonb; b jsonb; blocked boolean;
begin
 insert into auth.users(id,email,email_confirmed_at) values
 (seller,'ticket-seller-'||seller||'@example.invalid',now()),
 (buyer,'ticket-buyer-'||buyer||'@example.invalid',now()),
 (outsider,'ticket-other-'||outsider||'@example.invalid',now());
 select id into ev from brb_private.interest_events where event_date>=current_date limit 1;
 if ev is null then raise exception 'Nenhuma festa futura para o teste';end if;
 insert into brb_private.ticket_listings(event_id,seller_id,ticket_type,price) values(ev,seller,'Pista',100) returning id into lid;
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 perform public.brb_tickets('request',jsonb_build_object('id',lid));
 select id into rid from brb_private.ticket_requests where listing_id=lid;
 blocked:=false;
 begin perform public.brb_tickets('request',jsonb_build_object('id',lid));exception when others then blocked:=true;end;
 if not blocked then raise exception 'Reserva duplicada permitida';end if;
 a:=public.brb_ticket_service('reserve',jsonb_build_object('id',rid,'actor',buyer,'mode','test','fee_payer','seller'));
 if (a#>>'{payment,amount_cents}')::int<>10000 or (a#>>'{payment,seller_cents}')::int<>9500 then raise exception 'Taxa errada';end if;
 b:=public.brb_ticket_service('reserve',jsonb_build_object('id',rid,'actor',buyer,'mode','test','fee_payer','buyer'));
 if a->'payment'<>b->'payment' then raise exception 'Repetição mudou o pagamento';end if;
 blocked:=false;
 begin perform public.brb_ticket_service('context',jsonb_build_object('id',rid,'actor',outsider));exception when others then blocked:=true;end;
 if not blocked then raise exception 'Conta externa acessou contexto de cobrança';end if;
 perform set_config('request.jwt.claim.sub',outsider::text,true);
 blocked:=false;
 begin perform public.brb_ticket_journey('get',jsonb_build_object('id',rid));exception when others then blocked:=true;end;
 if not blocked then raise exception 'Conta externa acessou pedido';end if;
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 blocked:=false;
 begin perform public.brb_ticket_journey('cancel',jsonb_build_object('id',rid));exception when others then blocked:=true;end;
 if not blocked then raise exception 'Pagamento pendente liberou reserva';end if;
 blocked:=false;
 begin perform public.brb_ticket_journey('received',jsonb_build_object('id',rid,'reference','Recebimento fora da etapa'));exception when others then blocked:=true;end;
 if not blocked then raise exception 'Recebimento antecipado permitido';end if;
 perform public.brb_ticket_service('reconcile',jsonb_build_object('id',rid,'provider_id','qa-order','payment_status','paid','result','{}'::jsonb));
 perform public.brb_ticket_service('reconcile',jsonb_build_object('id',rid,'provider_id','qa-order','payment_status','pending','result','{}'::jsonb));
 if (select status from brb_private.ticket_requests where id=rid)<>'pagamento_confirmado' then raise exception 'Webhook antigo reverteu pagamento';end if;
 perform set_config('request.jwt.claim.sub',seller::text,true);
 insert into storage.objects(bucket_id,name) values('brb-ticket-evidence',rid||'/'||seller||'/qa');
 perform public.brb_ticket_journey('sent',jsonb_build_object('id',rid,'reference','Transferência QA na plataforma oficial','object_path',rid||'/'||seller||'/qa'));
 perform set_config('request.jwt.claim.sub',buyer::text,true);
 perform public.brb_ticket_journey('received',jsonb_build_object('id',rid,'reference','Ingresso conferido na plataforma oficial'));
 select id into owner_id from auth.users where brb_private.is_owner(id) limit 1;
 if owner_id is null then raise exception 'Owner ausente';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.brb_tickets_admin('advance',jsonb_build_object('id',rid,'status','concluida','reference','Comprovante QA de repasse realizado'));
 if (select status from brb_private.ticket_requests where id=rid)<>'concluida' then raise exception 'Repasse não concluiu';end if;
 if (select count(*) from brb_private.ticket_mail where request_id=rid)<>10 then raise exception 'Fila de e-mails inválida';end if;
 if has_function_privilege('authenticated','public.brb_ticket_service(text,jsonb)','execute') or has_function_privilege('anon','public.brb_ticket_service(text,jsonb)','execute') then raise exception 'Serviço financeiro exposto';end if;
end $test$;
