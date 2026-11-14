-- Onde é o after?: editar um after já cadastrado.
-- Só o anfitrião ou o owner edita, e só enquanto o after está aberto. As vagas não podem ficar abaixo do número de confirmados.
-- Aditiva: não mexe na brb_after nem nas tabelas; cria só a função brb_after_edit.
begin;

create function public.brb_after_edit(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a brb_private.afters; aid uuid; n int; v int;
 f text; b text; e text; h text; d text; m text; ph jsonb;
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
 if a.status<>'aberto' then raise exception 'Só dá para editar um after que ainda está aberto.';end if;

 f:=trim(coalesce(payload->>'festa',''));b:=trim(coalesce(payload->>'bairro',''));e:=trim(coalesce(payload->>'endereco',''));
 h:=trim(coalesce(payload->>'hora',''));d:=trim(coalesce(payload->>'desc',''));m:=payload->>'modo';
 if length(f) not between 2 and 80 then raise exception 'Diga depois de qual festa é o after.';end if;
 if length(b) not between 2 and 40 then raise exception 'Escolha o bairro.';end if;
 if length(e) not between 5 and 160 then raise exception 'Informe o endereço completo do after.';end if;
 if length(h) not between 3 and 60 then raise exception 'Informe o dia e o horário.';end if;
 if length(d)>400 then raise exception 'A descrição passou de 400 caracteres.';end if;
 if m is null or m not in ('livre','aprovacao') then raise exception 'Escolha como as pessoas entram.';end if;
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

 update brb_private.afters set festa=f,bairro=b,endereco=e,hora=h,vagas=v,modo=m,descr=d,fotos=ph where id=aid;
 if a.host<>u then insert into brb_private.management_log(actor,action,target) values(u,'owner:after_edit',aid::text);end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_after_edit(jsonb) from public,anon;
grant execute on function public.brb_after_edit(jsonb) to authenticated;

commit;
