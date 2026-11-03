-- O @ do Instagram passa a ser obrigatório para criar conta no site (exigido também pelo servidor, não só pela tela).
-- 1) Conta nova (cadastro feito pelo site, com brb_app): precisa trazer um @ válido e livre; o perfil nasce junto com a conta.
-- 2) Contas que já existem com o @ guardado no cadastro mas sem perfil (ex.: quem ainda não abriu o Spotted) ganham o perfil agora.
begin;

create or replace function brb_private.require_nick_on_signup() returns trigger
language plpgsql security definer set search_path='' as $$
declare n text:=btrim(coalesce(new.raw_user_meta_data->>'nick',''));
begin
 if coalesce(new.raw_user_meta_data->>'brb_app','')<>'true' then return new;end if;
 if n !~ '^[A-Za-z0-9_.]{3,24}$' then raise exception 'Informe o @ do seu Instagram: 3 a 24 letras, números, pontos ou sublinhados.';end if;
 if exists(select 1 from brb_private.profiles p where lower(p.nick)=lower(n)) then raise exception 'Esse @ já está em uso por outra conta.';end if;
 return new;
end $$;
revoke all on function brb_private.require_nick_on_signup() from public,anon,authenticated;
drop trigger if exists brb_require_nick on auth.users;
create trigger brb_require_nick before insert on auth.users for each row execute function brb_private.require_nick_on_signup();

create or replace function brb_private.create_profile_on_signup() returns trigger
language plpgsql security definer set search_path='' as $$
declare n text:=btrim(coalesce(new.raw_user_meta_data->>'nick',''));
begin
 if coalesce(new.raw_user_meta_data->>'brb_app','')='true' and n ~ '^[A-Za-z0-9_.]{3,24}$' then
  insert into brb_private.profiles(user_id,nick) values(new.id,n) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function brb_private.create_profile_on_signup() from public,anon,authenticated;
drop trigger if exists brb_create_profile on auth.users;
create trigger brb_create_profile after insert on auth.users for each row execute function brb_private.create_profile_on_signup();

insert into brb_private.profiles(user_id,nick)
select x.id,btrim(x.raw_user_meta_data->>'nick') from auth.users x
where not exists(select 1 from brb_private.profiles p where p.user_id=x.id)
 and btrim(coalesce(x.raw_user_meta_data->>'nick','')) ~ '^[A-Za-z0-9_.]{3,24}$'
 and not exists(select 1 from brb_private.profiles p2 where lower(p2.nick)=lower(btrim(x.raw_user_meta_data->>'nick')))
on conflict do nothing;
commit;
