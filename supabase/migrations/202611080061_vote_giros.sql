-- Giros da avaliação de DJ (decisão do Lucas, 05/11/2026): 1 giro pela avaliação e mais 2 se ela vier com resenha (total 3).
-- Spotted continua igual: 5 por foto postada e 1 por comentário. Vale para avaliações daqui em diante;
-- quem já avaliou mantém os giros que ganhou. Continua valendo uma vez por pessoa e DJ.
begin;

create or replace function brb_private.points_vote() returns trigger
language plpgsql security definer set search_path='' as $$
declare uid uuid; dj text;
begin
 begin
  if new.kind<>'vote' then return new;end if;
  uid:=nullif(new.payload->>'user_id','')::uuid; dj:=new.payload->>'dj';
  if uid is null or dj is null then return new;end if;
  perform brb_private.award_points_nocap(uid,1,'vote:'||md5(dj));
  if length(btrim(coalesce(new.payload->>'comment','')))>0 then perform brb_private.award_points_nocap(uid,2,'vote-review:'||md5(dj));end if;
 exception when others then null;
 end;
 return new;
end $$;
revoke all on function brb_private.points_vote() from public,anon,authenticated;

commit;
