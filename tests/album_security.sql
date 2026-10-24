-- Integration checks against the applied schema. All fixture changes roll back.
begin;
do $qa$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();r uuid:=gen_random_uuid();x jsonb;y jsonb;i integer;
begin
 insert into auth.users(id,email,aud,role,email_confirmed_at,created_at,updated_at) values(a,'qa_album_a@example.com','authenticated','authenticated',now(),now(),now()),(b,'qa_album_b@example.com','authenticated','authenticated',now(),now(),now());
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated','aal','aal1')::text,true);
 x:=public.brb_album('state'); y:=public.brb_album('state');
 if (x->>'giros')::int<>10 or x<>y then raise exception 'Welcome must be granted exactly once';end if;
 x:=public.brb_album('spin',jsonb_build_object('request_id',r));y:=public.brb_album('spin',jsonb_build_object('request_id',r));
 if x<>y or (x->>'giros')::int<>9 or (select count(*) from brb_private.album_draws where user_id=a)<>1 then raise exception 'Duplicate request charged twice';end if;
 begin perform public.brb_album('spin',jsonb_build_object('request_id',gen_random_uuid(),'giros',1000));raise exception 'Tampering accepted';exception when others then if sqlerrm='Tampering accepted' then raise;end if;end;
 begin perform public.brb_album('state',jsonb_build_object('user_id',b));raise exception 'Other owner accepted';exception when others then if sqlerrm='Other owner accepted' then raise;end if;end;
 for i in 1..9 loop
  update brb_private.album_draws set created_at=now()-interval '3 seconds' where user_id=a;
  perform public.brb_album('spin',jsonb_build_object('request_id',gen_random_uuid()));
 end loop;
 begin perform public.brb_album('spin',jsonb_build_object('request_id',gen_random_uuid()));raise exception 'Negative balance accepted';exception when others then if sqlerrm='Negative balance accepted' then raise;end if;end;
 if (select spins from brb_private.album_accounts where user_id=a)<>0 or (select sum(quantity) from brb_private.album_inventory where user_id=a)<>10 or (select sum(delta) from brb_private.album_spin_ledger where user_id=a)<>0 then raise exception 'Ledger/inventory mismatch';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated','aal','aal1')::text,true);
 x:=public.brb_album('state');
 if (x->>'giros')::int<>10 or x->'coladas'<>'{}'::jsonb then raise exception 'Account isolation failed';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='brb_private' and c.relname like 'album_%' and c.relkind='r' and not c.relrowsecurity) then raise exception 'RLS missing';end if;
 if has_table_privilege('authenticated','brb_private.album_accounts','insert') or has_table_privilege('anon','brb_private.album_inventory','select') or has_function_privilege('anon','public.brb_album(text,jsonb)','execute') then raise exception 'Raw API permissions exposed';end if;
 perform set_config('request.jwt.claims','{}',true);
 begin perform public.brb_album('state');raise exception 'Anonymous accepted';exception when others then if sqlerrm='Anonymous accepted' then raise;end if;end;
end $qa$;
select 'All personal album SQL checks passed; changes rolled back' as result;
rollback;
