-- Onde é o after?: moderação antes de publicar (status "em_analise" até o owner aprovar ou recusar)
-- e campo de entrada paga (pago/preco). A entrada paga ainda não cobra de verdade: "join" recusa
-- com uma mensagem clara até a intermediação de pagamento ser ligada numa migração futura.
begin;

do $$
declare cname text;
begin
 select conname into cname from pg_constraint
  where conrelid='brb_private.afters'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%status in%';
 if cname is not null then execute format('alter table brb_private.afters drop constraint %I', cname); end if;
 select conname into cname from pg_constraint
  where conrelid='brb_private.afters'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%modo in%';
 if cname is not null then execute format('alter table brb_private.afters drop constraint %I', cname); end if;
end $$;

alter table brb_private.afters add constraint afters_status_check
 check(status in ('em_analise','aberto','encerrado','rejeitado','removido'));
alter table brb_private.afters alter column status set default 'em_analise';

alter table brb_private.afters add column pago boolean not null default false;
alter table brb_private.afters add column preco numeric(10,2);
alter table brb_private.afters add constraint afters_preco_check check(preco is null or (preco between 1 and 2000));
alter table brb_private.afters add constraint afters_pago_preco_check check((pago and preco is not null) or (not pago and preco is null));
alter table brb_private.afters add constraint afters_modo_check check((pago and modo='pago') or (not pago and modo in ('livre','aprovacao')));

create or replace function public.brb_after(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a brb_private.afters; j brb_private.after_joins; aid uuid; tid uuid; n int;
 f text; b text; e text; h text; d text; m text; v int; ph jsonb; st text; s1 int; s2 int; s3 int; pago boolean; preco numeric;
begin
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Dados inválidos.';end if;
 if action is null or action not in ('list','create','join','decide','end','rate','remove') then raise exception 'Ação inválida.';end if;

 if action='list' then
  return jsonb_build_object('items',coalesce((select jsonb_agg(x order by x.created_at desc) from (
   select a2.id,a2.festa,a2.bairro,a2.hora,a2.vagas,a2.modo,a2.descr as "desc",a2.fotos,a2.status,a2.pago,a2.preco,a2.created_at,
    (abs(hashtextextended(a2.id::text,0))%360)::int as hue,
    (select p.nick from brb_private.profiles p where p.user_id=a2.host) as host,
    (select count(*) from brb_private.after_joins jj where jj.after_id=a2.id and jj.status='confirmado')::int as ocupadas,
    case when u is not null and (a2.host=u or brb_private.is_owner(u)
      or exists(select 1 from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u and jj.status='confirmado'))
     then a2.endereco else null end as endereco,
    case when u is null then null else (select jj.status from brb_private.after_joins jj where jj.after_id=a2.id and jj.user_id=u) end as my,
    case when u is null then false else exists(select 1 from brb_private.after_ratings r where r.after_id=a2.id and r.user_id=u) end as rated,
    coalesce((select jsonb_agg(jsonb_build_object('som',r.som,'espaco',r.espaco,'fraternidade',r.fraternidade)) from brb_private.after_ratings r where r.after_id=a2.id),'[]'::jsonb) as notas,
    case when u is not null and a2.host=u then coalesce((select jsonb_agg(jsonb_build_object('uid',jj.user_id,'nome',pp.nick,
       'status',case jj.status when 'confirmado' then 'aprovado' else jj.status end) order by jj.created_at)
       from brb_private.after_joins jj join brb_private.profiles pp on pp.user_id=jj.user_id where jj.after_id=a2.id),'[]'::jsonb)
     else '[]'::jsonb end as reqs
   from brb_private.afters a2
   where a2.status<>'removido' and (a2.status in ('aberto','encerrado') or (u is not null and (a2.host=u or brb_private.is_owner(u))))
   order by a2.created_at desc limit 200
  ) x),'[]'::jsonb));
 end if;

 if u is null then raise exception 'Entre na sua conta para continuar.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
 if not exists(select 1 from brb_private.profiles where user_id=u) then raise exception 'Crie seu @ do Instagram na conta antes.';end if;

 if action='create' then
  if not brb_private.is_clubber(u) then raise exception 'Só membros do BRB Clubbers podem cadastrar afters.';end if;
  perform pg_advisory_xact_lock(hashtextextended('after-create:'||u::text,0));
  if (select count(*) from brb_private.afters x where x.host=u and x.status in('aberto','em_analise'))>=5
  then raise exception 'Você já tem 5 afters abertos ou em análise. Encerre um antes de cadastrar outro.';end if;
  f:=trim(coalesce(payload->>'festa',''));b:=trim(coalesce(payload->>'bairro',''));e:=trim(coalesce(payload->>'endereco',''));
  h:=trim(coalesce(payload->>'hora',''));d:=trim(coalesce(payload->>'desc',''));
  pago:=coalesce((payload->>'pago')::boolean,false);
  if length(f) not between 2 and 80 then raise exception 'Diga depois de qual festa é o after.';end if;
  if length(b) not between 2 and 40 then raise exception 'Escolha o bairro.';end if;
  if length(e) not between 5 and 160 then raise exception 'Informe o endereço completo do after.';end if;
  if length(h) not between 3 and 60 then raise exception 'Informe o dia e o horário.';end if;
  if length(d)>400 then raise exception 'A descrição passou de 400 caracteres.';end if;
  if pago then
   begin preco:=round((payload->>'preco')::numeric,2); exception when others then raise exception 'Informe o valor da entrada.'; end;
   if preco is null or preco<1 or preco>2000 then raise exception 'O valor da entrada deve ficar entre R$ 1 e R$ 2.000.';end if;
   m:='pago';
  else
   preco:=null; m:=payload->>'modo';
   if m is null or m not in ('livre','aprovacao') then raise exception 'Escolha como as pessoas entram.';end if;
  end if;
  if coalesce(payload->>'vagas','') !~ '^[0-9]{1,3}$' then raise exception 'Informe quantas pessoas cabem.';end if;
  v:=(payload->>'vagas')::int;
  if v not between 1 and 200 then raise exception 'As vagas vão de 1 a 200.';end if;
  ph:=coalesce(payload->'fotos','[]'::jsonb);
  if jsonb_typeof(ph)<>'array' or jsonb_array_length(ph)>6 then raise exception 'Envie até 6 fotos.';end if;
  if exists(select 1 from jsonb_array_elements(ph) z where jsonb_typeof(z)<>'string' or length(z#>>'{}')>450000
    or (z#>>'{}') !~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$') then raise exception 'Foto inválida ou grande demais.';end if;
  insert into brb_private.afters(host,festa,bairro,endereco,hora,vagas,modo,descr,fotos,pago,preco,status)
  values(u,f,b,e,h,v,m,d,ph,pago,preco,'em_analise') returning id into aid;
  return jsonb_build_object('id',aid);
 end if;

 if coalesce(payload->>'id','') !~ '^[0-9a-f-]{36}$' then raise exception 'After inválido.';end if;
 aid:=(payload->>'id')::uuid;
 select * into a from brb_private.afters x where x.id=aid and x.status<>'removido' for update;
 if not found then raise exception 'After não encontrado.';end if;

 if action='join' then
  if a.status<>'aberto' then raise exception 'Este after está encerrado.';end if;
  if a.host=u then raise exception 'Este after é seu.';end if;
  if a.modo='pago' then raise exception 'Este after é pago. Em breve você vai poder comprar sua vaga aqui mesmo.';end if;
  select * into j from brb_private.after_joins x where x.after_id=aid and x.user_id=u;
  if found then return jsonb_build_object('status',j.status);end if;
  if a.modo='livre' then
   select count(*) into n from brb_private.after_joins x where x.after_id=aid and x.status='confirmado';
   if n>=a.vagas then raise exception 'Este after está lotado.';end if;
   st:='confirmado';
  else st:='pendente';
  end if;
  insert into brb_private.after_joins(after_id,user_id,status) values(aid,u,st);
  return jsonb_build_object('status',st);
 end if;

 if action='decide' then
  if a.host<>u and not brb_private.is_owner(u) then raise exception 'Só o anfitrião decide os pedidos.';end if;
  if coalesce(payload->>'uid','') !~ '^[0-9a-f-]{36}$' or payload->>'status' not in ('aprovado','recusado') then raise exception 'Pedido inválido.';end if;
  tid:=(payload->>'uid')::uuid;
  select * into j from brb_private.after_joins x where x.after_id=aid and x.user_id=tid for update;
  if not found or j.status<>'pendente' then raise exception 'Este pedido já foi decidido.';end if;
  if payload->>'status'='aprovado' then
   select count(*) into n from brb_private.after_joins x where x.after_id=aid and x.status='confirmado';
   if n>=a.vagas then raise exception 'Sem vagas livres.';end if;
   update brb_private.after_joins set status='confirmado' where after_id=aid and user_id=tid;
  else
   update brb_private.after_joins set status='recusado' where after_id=aid and user_id=tid;
  end if;
  return jsonb_build_object('ok',true);
 end if;

 if action='end' then
  if a.host<>u and not brb_private.is_owner(u) then raise exception 'Só o anfitrião encerra o after.';end if;
  if a.status='em_analise' then update brb_private.afters set status='removido' where id=aid;
  elsif a.status='aberto' then update brb_private.afters set status='encerrado' where id=aid;
  else raise exception 'Este after não pode ser encerrado agora.';end if;
  return jsonb_build_object('ok',true);
 end if;

 if action='remove' then
  if not brb_private.is_owner(u) then raise exception 'Só o owner remove afters.';end if;
  update brb_private.afters set status='removido' where id=aid;
  return jsonb_build_object('ok',true);
 end if;

 if action='rate' then
  if a.status<>'encerrado' then raise exception 'Só dá para avaliar depois que o after for encerrado.';end if;
  if not exists(select 1 from brb_private.after_joins x where x.after_id=aid and x.user_id=u and x.status='confirmado')
  then raise exception 'Só quem foi confirmado no after pode avaliar.';end if;
  if a.host=u then raise exception 'Você não avalia o seu próprio after.';end if;
  if coalesce(payload->>'som','') !~ '^[1-5]$' or coalesce(payload->>'espaco','') !~ '^[1-5]$' or coalesce(payload->>'fraternidade','') !~ '^[1-5]$'
  then raise exception 'Dê uma nota de 1 a 5 em cada item.';end if;
  s1:=(payload->>'som')::int;s2:=(payload->>'espaco')::int;s3:=(payload->>'fraternidade')::int;
  insert into brb_private.after_ratings(after_id,user_id,som,espaco,fraternidade) values(aid,u,s1,s2,s3) on conflict do nothing;
  if not found then raise exception 'Você já avaliou este after.';end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Ação inválida.';
end $$;
revoke all on function public.brb_after(text,jsonb) from public;
grant execute on function public.brb_after(text,jsonb) to anon,authenticated;

create or replace function public.brb_after_edit(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a brb_private.afters; aid uuid; n int; v int;
 f text; b text; e text; h text; d text; m text; ph jsonb; pago boolean; preco numeric;
begin
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Dados inválidos.';end if;
 if u is null then raise exception 'Entre na sua conta para continuar.';end if;
 if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
 then raise exception 'Verifique o código de dois fatores na sua conta.';end if;
 if coalesce(payload->>'id','') !~ '^[0-9a-f-]{36}$' then raise exception 'After inválido.';end if;
 aid:=(payload->>'id')::uuid;
 select * into a from brb_private.afters x where x.id=aid and x.status<>'removido' for update;
 if not found then raise exception 'After não encontrado.';end if;
 if a.host<>u and not brb_private.is_owner(u) then raise exception 'Só o anfitrião ou o owner pode editar este after.';end if;
 if a.status not in ('aberto','em_analise') then raise exception 'Só dá para editar um after que ainda está aberto ou em análise.';end if;

 f:=trim(coalesce(payload->>'festa',''));b:=trim(coalesce(payload->>'bairro',''));e:=trim(coalesce(payload->>'endereco',''));
 h:=trim(coalesce(payload->>'hora',''));d:=trim(coalesce(payload->>'desc',''));
 pago:=coalesce((payload->>'pago')::boolean,false);
 if length(f) not between 2 and 80 then raise exception 'Diga depois de qual festa é o after.';end if;
 if length(b) not between 2 and 40 then raise exception 'Escolha o bairro.';end if;
 if length(e) not between 5 and 160 then raise exception 'Informe o endereço completo do after.';end if;
 if length(h) not between 3 and 60 then raise exception 'Informe o dia e o horário.';end if;
 if length(d)>400 then raise exception 'A descrição passou de 400 caracteres.';end if;
 if pago then
  begin preco:=round((payload->>'preco')::numeric,2); exception when others then raise exception 'Informe o valor da entrada.'; end;
  if preco is null or preco<1 or preco>2000 then raise exception 'O valor da entrada deve ficar entre R$ 1 e R$ 2.000.';end if;
  m:='pago';
 else
  preco:=null; m:=payload->>'modo';
  if m is null or m not in ('livre','aprovacao') then raise exception 'Escolha como as pessoas entram.';end if;
 end if;
 if coalesce(payload->>'vagas','') !~ '^[0-9]{1,3}$' then raise exception 'Informe quantas pessoas cabem.';end if;
 v:=(payload->>'vagas')::int;
 if v not between 1 and 200 then raise exception 'As vagas vão de 1 a 200.';end if;
 select count(*) into n from brb_private.after_joins x where x.after_id=aid and x.status='confirmado';
 if v<n then raise exception 'Já há % pessoas confirmadas. As vagas não podem ficar abaixo disso.',n;end if;

 if payload ? 'fotos' then
  ph:=payload->'fotos';
  if jsonb_typeof(ph)<>'array' or jsonb_array_length(ph)>6 then raise exception 'Envie até 6 fotos.';end if;
  if exists(select 1 from jsonb_array_elements(ph) z where jsonb_typeof(z)<>'string' or length(z#>>'{}')>450000
    or (z#>>'{}') !~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$') then raise exception 'Foto inválida ou grande demais.';end if;
 else
  ph:=a.fotos;
 end if;

 update brb_private.afters set festa=f,bairro=b,endereco=e,hora=h,vagas=v,modo=m,descr=d,fotos=ph,pago=pago,preco=preco where id=aid;
 if a.host<>u then insert into brb_private.management_log(actor,action,target) values(u,'owner:after_edit',aid::text);end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_after_edit(jsonb) from public,anon;
grant execute on function public.brb_after_edit(jsonb) to authenticated;

-- Fila de moderação do owner: aprovar ou recusar afters antes de publicar.
create function public.brb_after_moderate(action text,payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); aid uuid; a brb_private.afters;
begin
 if u is null or not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
 if action is null or action not in ('list','approve','reject') then raise exception 'Ação inválida.';end if;
 if action in ('approve','reject') then
  if coalesce(payload->>'id','') !~ '^[0-9a-f-]{36}$' then raise exception 'After inválido.';end if;
  aid:=(payload->>'id')::uuid;
  select * into a from brb_private.afters x where x.id=aid for update;
  if not found or a.status<>'em_analise' then raise exception 'Este after já foi decidido.';end if;
  update brb_private.afters set status=(case when action='approve' then 'aberto' else 'rejeitado' end) where id=aid;
 end if;
 return jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
   'id',a2.id,'festa',a2.festa,'bairro',a2.bairro,'endereco',a2.endereco,'hora',a2.hora,'vagas',a2.vagas,
   'modo',a2.modo,'pago',a2.pago,'preco',a2.preco,'desc',a2.descr,'fotos',a2.fotos,'status',a2.status,'created_at',a2.created_at,
   'host_nick',p.nick,'host_email',hu.email) order by a2.created_at desc)
  from brb_private.afters a2 join auth.users hu on hu.id=a2.host left join brb_private.profiles p on p.user_id=a2.host
  where a2.status<>'removido' limit 300),'[]'::jsonb));
end $$;
revoke all on function public.brb_after_moderate(text,jsonb) from public,anon;
grant execute on function public.brb_after_moderate(text,jsonb) to authenticated;

commit;
