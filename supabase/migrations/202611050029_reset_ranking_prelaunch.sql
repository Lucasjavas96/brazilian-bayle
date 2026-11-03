-- Ranking zerado de novo para o pré-lançamento (grupo controlado de testadores), por pedido do Lucas.
-- As avaliações de teste ficam guardadas em brb_private.votes_backup_prelaunch (só o banco acessa).
begin;
create table brb_private.votes_backup_prelaunch as select * from brb_private.submissions where kind='vote';
alter table brb_private.votes_backup_prelaunch enable row level security;
revoke all on brb_private.votes_backup_prelaunch from public,anon,authenticated;
delete from brb_private.submissions where kind='vote';
commit;
