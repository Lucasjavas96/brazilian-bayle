# Brazilian Bayle — Supabase

Base do site: `Lucasjavas96/brazilian-bayle`, commit `6731d23`.
Projeto Supabase: `bereyocdqacudfvazdpa` (conta ducatsdark, São Paulo).

## Dados e acesso

- `brb_private.submissions`: candidaturas, inscrições e avaliações pendentes.
- `brb_private.profiles`: nickname ligado ao usuário de Supabase Auth.
- `brb_private.posts`, `reactions`, `comments`, `reports`: mural compartilhado.
- Todas as tabelas têm RLS e ficam num schema não exposto pela API. O cliente
  usa somente a função `public.brb_action`, que valida campos e permissões.
- Nenhuma tabela preexistente `bb_*` ou de outro sistema foi alterada.
- O navegador recebe somente a chave **publicável** em `backend-config.js`.
  Nunca inserir `service_role` ou `sb_secret_*` nesse arquivo.

## Comportamento

Avaliações são guardadas como pendentes e não alteram o ranking demonstrativo.
O peso inicial é sempre 1. Declarar ser membro não concede peso 3.
A unicidade por Instagram/apresentação é aplicada no banco, mas não comprova
que quem preenche controla aquele Instagram. A análise da equipe continua necessária.
Os votos locais antigos não são importados como votos oficiais.

O Spotted usa Supabase Auth, confirmação de e-mail e sessão local própria da marca.
Posts e interações são compartilhados. A opção Anônimo oculta a identidade na
API pública, mantendo o vínculo privado para moderação. Após três denúncias
distintas, uma publicação vai para revisão. A equipe revisa pelo SQL Editor;
não foi criado painel administrativo nesta alteração.

Fotos são comprimidas no navegador e armazenadas em data URI privada no banco,
com limite total de 650 kB por chamada. Não há bucket público com fotos ocultas.
O feed traz no máximo 50 posts. Storage/paginação são próximos passos para escala.

## Inspecionar registros (SQL Editor / administrador)

```sql
select id, kind, status, payload, created_at
from brb_private.submissions order by created_at desc;

select id, title, status, created_at
from brb_private.posts where status='review';
```

Não conceder acesso dessas consultas a `anon` ou `authenticated`.

## Configuração e implantação

`backend-config.js`, `backend.js` e o SDK versionado são copiados pelo build.
A Vercel mantém `node _local/build.js` e publica `dist/`. Não são necessárias
chaves privadas na Vercel para esse desenho de RPC.
O retorno de confirmação `https://brazilian-bayle.vercel.app/spotted` foi
adicionado à lista permitida do Auth sem modificar o Site URL dos outros apps.

Migrações 001–003 foram executadas nesta ordem pela CLI autenticada, usando
`supabase db query --linked --project-ref bereyocdqacudfvazdpa --file <arquivo>`.
Não executar novamente a migração001: ela cria tabelas. Manter novas alterações
em migrações adicionais. Os posts da migração002 são exemplos rotulados como
demonstração, sem contagens inventadas de reações.

## Verificações realizadas

- Build das11páginas e sintaxe JavaScript.
- Navegação móvel em início, clube, loja, ranking e Spotted sem erros JS.
- Feed real compartilhado e envio da lista de espera pelo frontend.
- Auth real, perfis, postagem, reação, comentário e denúncia com contas
  temporárias eliminadas ao fim dos testes.
- Bloqueio de edição por outra conta, ocultação da identidade, consentimento
  nulo/inválido, voto duplicado e peso de membro não verificado.
- Formulários testados em transação revertida, sem deixar dados de teste.
