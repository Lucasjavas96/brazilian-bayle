-- Regra final do Spotted: cada ponto equivale a um giro na roleta do álbum
-- (5 por post com foto, 1 por comentário). Mantém o teto de 40 pontos por dia e a trava anti-duplicação.
-- Só substitui a função de pontos criada na 202610250005; os gatilhos continuam os mesmos.
begin;

create or replace function brb_private.award_points(u uuid,pts integer,ref text) returns void
language plpgsql security definer set search_path='' as $$
declare today integer;
begin
  if u is null or pts<=0 then return;end if;
  perform pg_advisory_xact_lock(hashtextextended('brb-album:'||u::text,0));
  select coalesce(sum(l.points),0) into today from brb_private.points_ledger l
   where l.user_id=u and l.reference like 'spotted:%'
     and l.created_at>=(date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  if today+pts>40 then return;end if;
  insert into brb_private.points_ledger(user_id,reference,points) values(u,ref,pts) on conflict do nothing;
  if not found then return;end if;
  insert into brb_private.album_accounts(user_id) values(u) on conflict do nothing;
  update brb_private.album_accounts set spins=spins+pts,updated_at=now() where user_id=u;
  insert into brb_private.album_spin_ledger(user_id,reference,delta) values(u,'spotted-points:'||ref,pts) on conflict do nothing;
end $$;
revoke all on function brb_private.award_points(uuid,integer,text) from public,anon,authenticated;

commit;
