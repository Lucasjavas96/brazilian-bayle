-- Álbum: placar e ranking dos colecionadores (aprovado pelo Lucas em 05/11/2026).
-- Pontos por figurinha colada (só a 1ª cópia conta): OVR × multiplicador da raridade
--   Comum ×1 · Rara ×1,5 · Épica ×3 · Lendária ×5.
-- Bônus: página (país) completa = +20% dos pontos daquela página; álbum completo = +5.000.
-- Desempate: quem chegou primeiro à pontuação. O placar fica salvo na conta e é recalculado
-- por gatilho quando a pessoa ganha uma figurinha nova ou quando o catálogo muda (OVR, raridade).
-- O owner (giros infinitos) fica fora do ranking.
begin;

alter table brb_private.album_accounts
  add column if not exists score integer not null default 0,
  add column if not exists cards_count integer not null default 0,
  add column if not exists score_at timestamptz,
  add column if not exists completed_at timestamptz;
create index if not exists album_accounts_rank on brb_private.album_accounts(score desc, score_at asc);

create or replace function brb_private.album_card_points(card jsonb) returns integer
language sql immutable set search_path='' as $$
  select round(coalesce((card->>'ovr')::numeric,0) *
    case card->>'cls' when 'lendaria' then 5 when 'epica' then 3 when 'rara' then 1.5 else 1 end)::integer
$$;

create or replace function brb_private.album_score(u uuid, out score integer, out cards integer, out complete boolean)
language sql stable set search_path='' as $$
  with cat as (
    select slug, split_part(card->>'num',' ',1) as pg, brb_private.album_card_points(card) as pts
    from brb_private.album_catalog where active),
  own as (
    select c.slug, c.pts from cat c join brb_private.album_inventory i on i.card_slug=c.slug and i.user_id=u),
  pages as (
    select c.pg, sum(c.pts) as tot, count(*) as n, count(o.slug) as got
    from cat c left join own o on o.slug=c.slug group by c.pg),
  t as (select (select count(*) from own) as got, (select count(*) from cat) as n)
  select (coalesce((select sum(pts) from own),0)
          + coalesce((select sum(round(tot*0.2)) from pages where got=n),0)
          + case when t.n>0 and t.got=t.n then 5000 else 0 end)::integer,
         t.got::integer,
         (t.n>0 and t.got=t.n)
  from t
$$;

create or replace function brb_private.album_recalc(u uuid, gain boolean) returns void
language plpgsql security definer set search_path='' as $$
declare s record;
begin
  select * into s from brb_private.album_score(u);
  update brb_private.album_accounts a set
    score_at = case when gain and s.score>a.score then now() else coalesce(a.score_at, case when s.score>0 then now() end) end,
    completed_at = case when s.complete then coalesce(a.completed_at, now()) else a.completed_at end,
    score = s.score,
    cards_count = s.cards
  where a.user_id=u;
end $$;

create or replace function brb_private.album_inventory_score() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform brb_private.album_recalc(coalesce(new.user_id, old.user_id), tg_op='INSERT');
  return null;
end $$;
drop trigger if exists album_inventory_score on brb_private.album_inventory;
create trigger album_inventory_score after insert or delete on brb_private.album_inventory
  for each row execute function brb_private.album_inventory_score();

create or replace function brb_private.album_catalog_score() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform brb_private.album_recalc(a.user_id, false) from brb_private.album_accounts a;
  return null;
end $$;
drop trigger if exists album_catalog_score on brb_private.album_catalog;
create trigger album_catalog_score after insert or update or delete on brb_private.album_catalog
  for each statement execute function brb_private.album_catalog_score();

-- placar inicial de quem já tem figurinhas; o desempate usa a data da última figurinha nova
do $init$ begin
  perform brb_private.album_recalc(a.user_id, false) from brb_private.album_accounts a;
  update brb_private.album_accounts a set score_at = (select max(i.first_received_at) from brb_private.album_inventory i where i.user_id=a.user_id)
   where a.score>0;
  update brb_private.album_accounts a set completed_at = score_at where a.completed_at is not null;
end $init$;

-- Ranking público: top 100 + a posição de quem está logado. Só o apelido aparece.
create or replace function public.brb_album_ranking() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare u uuid := auth.uid(); total integer; top jsonb; me jsonb; mine record; players integer;
begin
  select count(*) into total from brb_private.album_catalog where active;
  select count(*) into players from brb_private.album_accounts a where a.score>0 and not brb_private.is_owner(a.user_id);
  select coalesce(jsonb_agg(jsonb_build_object(
           'pos', r.pos, 'nick', coalesce(r.nick, 'colecionador'), 'pontos', r.score, 'cartas', r.cards_count,
           'completo', r.cards_count>=total and total>0, 'eu', r.user_id = u) order by r.pos), '[]'::jsonb)
    into top
    from (select a.user_id, a.score, a.cards_count, p.nick,
                 row_number() over (order by a.score desc, a.score_at asc nulls last, a.created_at asc) as pos
            from brb_private.album_accounts a
            left join brb_private.profiles p on p.user_id = a.user_id
           where a.score>0 and not brb_private.is_owner(a.user_id)
           order by a.score desc, a.score_at asc nulls last, a.created_at asc
           limit 100) r;
  if u is not null then
    select a.score, a.cards_count, a.score_at, a.created_at into mine from brb_private.album_accounts a where a.user_id = u;
    if found and mine.score>0 and not brb_private.is_owner(u) then
      me := jsonb_build_object('pontos', mine.score, 'cartas', mine.cards_count,
        'pos', 1 + (select count(*) from brb_private.album_accounts b
                     where b.score>0 and not brb_private.is_owner(b.user_id) and b.user_id<>u
                       and (b.score>mine.score or (b.score=mine.score and (coalesce(b.score_at,'infinity'),b.created_at) < (coalesce(mine.score_at,'infinity'),mine.created_at)))));
    elsif found then
      me := jsonb_build_object('pontos', mine.score, 'cartas', mine.cards_count, 'pos', null);
    end if;
  end if;
  return jsonb_build_object('total', total, 'jogadores', players, 'top', top, 'eu', me);
end $$;
revoke all on function public.brb_album_ranking() from public;
grant execute on function public.brb_album_ranking() to anon, authenticated;

commit;
