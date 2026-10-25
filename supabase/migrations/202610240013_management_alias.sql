do $$ declare definition text;begin
 select pg_get_functiondef('public.brb_manage(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'select id,kind,payload,status,created_at from brb_private.submissions order by created_at desc','select s0.id,s0.kind,s0.payload,s0.status,s0.created_at from brb_private.submissions s0 order by s0.created_at desc');
 execute definition;
end $$;
