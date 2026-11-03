-- Moderação passa a listar todos os posts do Spotted (inclusive os publicados sem denúncia) e ganha o filtro 'published'.
begin;

create or replace function public.brb_moderation_page(section text,filter_name text default 'todos',cursor jsonb default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); rows jsonb; total bigint; last_row jsonb; ct timestamptz; ci text;
begin
 if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Confirme seu acesso na página da conta.';end if;
 if section is null or section not in ('posts','apps') or filter_name is null or filter_name not in ('todos','denunciado','review','hidden','published')
 then raise exception 'Filtro inválido.';end if;
 if cursor is not null then
  if jsonb_typeof(cursor)<>'object' or octet_length(cursor::text)>500 or cursor->>'at' is null or cursor->>'id' is null then raise exception 'Página inválida.';end if;
  ct:=(cursor->>'at')::timestamptz;ci:=cursor->>'id';
 end if;
 if section='apps' then
  select count(*) into total from brb_private.submissions s where s.kind='application';
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id::text desc),'[]'::jsonb) into rows from (
   select s.id,s.status,s.created_at,s.payload as data from brb_private.submissions s where s.kind='application'
   and (ct is null or (s.created_at,s.id::text)<(ct,ci)) order by s.created_at desc,s.id::text desc limit 50
  ) x;
 else
  select count(*) into total from brb_private.posts p
  where (filter_name='todos' or (filter_name='denunciado' and exists(select 1 from brb_private.reports r where r.post_id=p.id)) or p.status=filter_name);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into rows from (
   select p.id,p.title,p.party,p.body,p.img,p.status,p.anon,p.is_demo,p.created_at,
    (select pr.nick from brb_private.profiles pr where pr.user_id=p.owner) as nick,
    (select count(*) from brb_private.reports r where r.post_id=p.id) as reports,
    coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'anon',c.anon,
     'nick',(select pr.nick from brb_private.profiles pr where pr.user_id=c.user_id),'created_at',c.created_at) order by c.created_at,c.id)
     from brb_private.comments c where c.post_id=p.id),'[]'::jsonb) as comments
   from brb_private.posts p
   where (filter_name='todos' or (filter_name='denunciado' and exists(select 1 from brb_private.reports r where r.post_id=p.id)) or p.status=filter_name)
    and (ct is null or (p.created_at,p.id)<(ct,ci)) order by p.created_at desc,p.id desc limit 20
  ) x;
 end if;
 last_row:=rows->(jsonb_array_length(rows)-1);
 return jsonb_build_object('items',rows,'total',total,'next',case when jsonb_array_length(rows)=case when section='apps' then 50 else 20 end
  then jsonb_build_object('at',last_row->>'created_at','id',last_row->>'id') else null end);
end $$;
revoke all on function public.brb_moderation_page(text,text,jsonb) from public,anon;
grant execute on function public.brb_moderation_page(text,text,jsonb) to authenticated;

commit;
