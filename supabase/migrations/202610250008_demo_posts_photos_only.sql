-- Posts de demonstração do Spotted: some a resenha avulsa e ficam só as fotos, sem texto.
-- Só mexe nos três posts de exemplo (s1, s3 e s5); posts de pessoas reais não são tocados.
begin;
delete from brb_private.posts where id='s3' and is_demo;
update brb_private.posts set body='' where id in ('s1','s5') and is_demo;
commit;
