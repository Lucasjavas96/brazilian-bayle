-- Lançamento: os posts de demonstração do Spotted saem do mural (ficam ocultos, reversível pela moderação).
begin;
update brb_private.posts set status='hidden' where is_demo and status<>'hidden';
commit;
