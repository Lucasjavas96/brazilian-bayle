-- Marcador de pontos do Spotted: devolve ao usuário logado o total de pontos ganhos (foto 5, comentário 1),
-- quanto já ganhou hoje (teto de 40 por dia, fuso de São Paulo) e os giros do álbum.
-- Só leitura. Não altera nenhuma função nem tabela existente.
begin;

create or replace function public.brb_points() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); total integer; today integer; wallet integer;
begin
  if u is null then return null;end if;
  select coalesce(sum(l.points),0) into total from brb_private.points_ledger l where l.user_id=u;
  select coalesce(sum(l.points),0) into today from brb_private.points_ledger l
   where l.user_id=u and l.reference like 'spotted:%'
     and l.created_at>=(date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  select coalesce((select a.spins from brb_private.album_accounts a where a.user_id=u),0) into wallet;
  return jsonb_build_object('points',total,'today',today,'daily_cap',40,'spins',wallet,'unlimited_spins',brb_private.is_owner(u));
end $$;
revoke all on function public.brb_points() from public,anon;
grant execute on function public.brb_points() to authenticated;

commit;
