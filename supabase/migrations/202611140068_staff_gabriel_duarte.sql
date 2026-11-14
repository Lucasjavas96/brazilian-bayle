-- Dá acesso de equipe (painel /gestao) ao Gabriel Duarte, pelo e-mail confirmado no Supabase Auth.
-- Aditiva: só insere se a conta já existir e estiver confirmada; não altera nada existente.
begin;

insert into brb_private.staff(user_id)
select id from auth.users
where lower(email)='gabridhill@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

commit;
