# Intermediação de ingressos

O comprador reserva um anúncio existente e acompanha o pedido em `/intermediacao?pedido=<uuid>`. A conta precisa ter e-mail confirmado. Valores são obtidos do anúncio no servidor e fixados na primeira tentativa de pagamento.

## Etapas

1. Reserva exclusiva do ingresso.
2. Resumo financeiro, aceite dos termos e Pix pelo Mercado Pago Orders API.
3. Confirmação por consulta ao provedor e webhook assinado, com conferência do recebedor, referência, moeda, ambiente e valor.
4. Vendedor transfere o ingresso pela plataforma emissora para o e-mail da conta compradora e anexa comprovante privado.
5. Comprador confere o ingresso na plataforma emissora e confirma o recebimento.
6. Equipe realiza o repasse ao vendedor e registra a referência do comprovante no painel de moderação.

O registro do envio feito pelo vendedor representa sua declaração e seu comprovante. O recebimento exige a confirmação separada do comprador. A integração não consulta a plataforma emissora do ingresso para certificar validade ou titularidade.

Ocorrências interrompem o avanço do pedido. Reembolsos feitos no Mercado Pago são reconciliados no pedido. Um reembolso depois do repasse abre ocorrência para análise da equipe. A resolução de ocorrências e a execução de repasses e reembolsos continuam operacionais, com a equipe. Automatizar repasses exige definição do modelo financeiro e acesso ao produto adequado do Mercado Pago.

## Configuração antes da ativação

- Definir `BRB_TICKETS_FEE_PAYER=buyer` para acrescentar 5% ao comprador, ou `seller` para descontar 5% do vendedor. Esta decisão está pendente do responsável pela Brazilian.
- Definir `BRB_TICKETS_MODE=test` ou `production` explicitamente.
- Conferir `BRB_MP_TEST_ACCESS_TOKEN`, `BRB_MP_TEST_SELLER_ID` ou as versões de produção `BRB_MP_ACCESS_TOKEN` e `BRB_MP_SELLER_ID`.
- Conferir `BRB_MP_WEBHOOK_SECRET`, `BRB_SMTP_USER` e `BRB_SMTP_PASSWORD`.
- Ativar `BRB_TICKETS_ENABLED=true` depois de uma transação de teste homologada.

Os valores reais dos segredos permanecem no Supabase. A ausência de configuração deixa a geração do Pix indisponível e permite consultar as reservas existentes.

O webhook já utilizado pela loja encaminha orders que não pertencem a pedidos da loja para `brb-tickets/webhook`. O endpoint da intermediação também pode ser cadastrado diretamente no Mercado Pago. O receiver valida a assinatura novamente. Não alterar o recebedor das compras existentes da loja.

## E-mails

Cada mudança de etapa cria notificações distintas para comprador e vendedor em uma fila privada. O envio usa o SMTP já configurado no Supabase, com layout preto e dourado e logo da Brazilian. Os links exigem autenticação e autorização para o pedido.

Consultas e webhooks tentam processar a fila. O workflow `Ticket transactional emails` também processa a fila a cada dez minutos, sujeito ao agendamento do GitHub. Há até oito tentativas, separadas pela janela de recuperação de dez minutos. A fila registra a confirmação de aceitação do SMTP. Ela não comprova chegada à caixa de entrada. Uma interrupção entre a aceitação SMTP e o registro no banco pode repetir uma mensagem.

## Validação realizada

- Migração e jornada no PostgreSQL em transação com rollback e contas fictícias.
- Reserva duplicada, acesso entre contas, acesso ao contexto financeiro, recebimento antecipado e cancelamento com pagamento pendente.
- Cobrança repetida mantém o snapshot e o identificador de idempotência.
- Eventos antigos preservam o pagamento confirmado.
- Testes da Edge Function com provedor simulado para assinatura falsa, autenticação, aceite, valor divergente e tentativa já existente.
- Testes de navegador em 390 e 1440 pixels com pagamento simulado.

Permanecem pendentes uma transação real no modo de teste do Mercado Pago, a entrega real de e-mail desta nova jornada e a definição de quem paga a taxa. Nenhum resultado simulado representa um pagamento ou e-mail real.
