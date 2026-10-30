-- Quiz Bailinho: a cada 5 perguntas diferentes respondidas corretamente, a pessoa ganha 1 ponto (= 1 giro na roleta do álbum).
-- Cada pergunta conta uma vez por conta, para refazer a trilha não render giro infinito. Só para conta confirmada.
begin;

create table brb_private.quiz_correct(
 user_id uuid not null references auth.users(id) on delete cascade,
 question text not null check(question ~ '^T[0-9]{1,2}-Q[0-9]{2}$'),
 created_at timestamptz not null default now(),
 primary key(user_id,question)
);
alter table brb_private.quiz_correct enable row level security;
revoke all on brb_private.quiz_correct from public,anon,authenticated;

create or replace function public.brb_quiz_correct(question text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); total integer; earned integer; granted integer; k integer;
begin
 if u is null then return jsonb_build_object('login',false);end if;
 if not exists(select 1 from auth.users x where x.id=u and x.email_confirmed_at is not null) then return jsonb_build_object('login',false);end if;
 if question is null or question !~ '^T[0-9]{1,2}-Q[0-9]{2}$' then raise exception 'Pergunta inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended('brb-album:'||u::text,0));
 insert into brb_private.quiz_correct(user_id,question) values(u,question) on conflict do nothing;
 select count(*) into total from brb_private.quiz_correct where user_id=u;
 earned:=total/5;
 select count(*) into granted from brb_private.points_ledger l where l.user_id=u and l.reference like 'quiz:block:%';
 for k in granted+1..earned loop
  perform brb_private.award_points(u,1,'quiz:block:'||k);
 end loop;
 return jsonb_build_object('login',true,'total',total,'points',earned,'new',greatest(earned-granted,0),'next_in',5-(total%5));
end $$;
revoke all on function public.brb_quiz_correct(text) from public,anon;
grant execute on function public.brb_quiz_correct(text) to authenticated;
commit;
