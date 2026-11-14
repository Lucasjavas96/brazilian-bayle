-- John Baladinha Jones (apelido johnbaladinhajones) vira administrador: entra na equipe (painel /gestao)
-- e ganha o direito de editar verbetes e textos do site (content_set/content_clear), sem ser owner.
-- O resto das ações de owner (apagar posts, promover equipe, giros do álbum) continua só do owner.
begin;

insert into brb_private.staff(user_id)
select p.user_id from brb_private.profiles p join auth.users u on u.id=p.user_id
where lower(p.nick)='johnbaladinhajones' and u.email_confirmed_at is not null
on conflict do nothing;

do $chk$ begin
  if not exists(select 1 from brb_private.staff s join brb_private.profiles p on p.user_id=s.user_id where lower(p.nick)='johnbaladinhajones') then
    raise exception 'Conta johnbaladinhajones não encontrada ou e-mail não confirmado.';
  end if;
end $chk$;

-- Equipe também pode gravar/limpar textos e fotos do site.
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_owner(text,jsonb)'::regprocedure) into definition;
  before:=definition;
  if position($a$if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;$a$ in definition)=0 then raise exception 'brb_owner: trecho não encontrado';end if;
  definition:=replace(definition,
    $a$if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;$a$,
    $b$if not (brb_private.is_owner(u) or (action in('content_set','content_clear') and exists(select 1 from brb_private.staff st where st.user_id=u))) then raise exception 'Acesso restrito ao owner.';end if;$b$);
  if definition=before then raise exception 'brb_owner: nada mudou';end if;
  execute definition;
end $mig$;

-- A leitura pública informa se quem está logado é da equipe (para mostrar o botão de editar verbete).
do $mig$ declare definition text; before text;
begin
  select pg_get_functiondef('public.brb_content(text)'::regprocedure) into definition;
  before:=definition;
  if position($a$'me_owner',brb_private.is_owner(auth.uid()),$a$ in definition)=0 then raise exception 'brb_content: trecho não encontrado';end if;
  definition:=replace(definition,
    $a$'me_owner',brb_private.is_owner(auth.uid()),$a$,
    $b$'me_owner',brb_private.is_owner(auth.uid()),'me_editor',exists(select 1 from brb_private.staff st where st.user_id=auth.uid()),$b$);
  if definition=before then raise exception 'brb_content: nada mudou';end if;
  execute definition;
end $mig$;

commit;
