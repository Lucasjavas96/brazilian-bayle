-- Moderação: o owner edita título, nome da festa e data de um post do Spotted (a exclusão definitiva já existe em brb_owner/post_delete).
begin;
create or replace function public.brb_post_edit(post_id text,new_title text,new_party text,new_date date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t text:=btrim(coalesce(new_title,'')); p text:=btrim(coalesce(new_party,'')); changed integer;
begin
  if not brb_private.is_owner(u) then raise exception 'Acesso restrito ao owner.';end if;
  if exists(select 1 from auth.mfa_factors where user_id=u and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2'
  then raise exception 'Confirme seu acesso na página da conta.';end if;
  if length(t) not between 1 and 120 then raise exception 'O título precisa ter de 1 a 120 caracteres.';end if;
  if length(p) not between 1 and 160 then raise exception 'O nome da festa precisa ter de 1 a 160 caracteres.';end if;
  if new_date is null or new_date<date '2000-01-01' or new_date>current_date+interval '2 years' then raise exception 'Data inválida.';end if;
  update brb_private.posts x set title=t,party=p,created_at=(new_date+x.created_at::time)::timestamptz where x.id=post_id;
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Post não encontrado.';end if;
  insert into brb_private.management_log(actor,action,target) values(u,'owner:post_edit',post_id);
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.brb_post_edit(text,text,text,date) from public,anon;
grant execute on function public.brb_post_edit(text,text,text,date) to authenticated;
commit;
