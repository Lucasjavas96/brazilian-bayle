do $$ declare definition text;begin
 select pg_get_functiondef('public.brb_manage(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,'payload->','brb_manage.payload->');
 execute definition;
end $$;
