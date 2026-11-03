-- Ranking zerado para o lançamento, por pedido do Lucas. As avaliações antigas não somem de vez:
-- ficam guardadas na tabela brb_private.votes_backup_20261104 (só o banco acessa) e podem ser devolvidas se for preciso.
begin;
create table brb_private.votes_backup_20261104 as select * from brb_private.submissions where kind='vote';
alter table brb_private.votes_backup_20261104 enable row level security;
revoke all on brb_private.votes_backup_20261104 from public,anon,authenticated;
delete from brb_private.submissions where kind='vote';
commit;
