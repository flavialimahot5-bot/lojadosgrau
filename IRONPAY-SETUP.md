# Configuração do Pix IronPay na Vercel

Cadastre os valores diretamente em Settings → Environment Variables do projeto lojadosgrau. Não envie tokens pelo chat, não coloque no GitHub e não use prefixos NEXT_PUBLIC_, VITE_ ou PUBLIC_. Use Production. Em Preview, mantenha PAYMENTS_ENABLED=false para não gerar cobranças reais em testes.

| Variável | Valor a cadastrar |
|---|---|
| IRONPAY_API_TOKEN | Token de API da sua conta IronPay |
| IRONPAY_PRODUCT_HASH | Hash do produto cadastrado na IronPay para representar os pedidos desta loja |
| IRONPAY_OFFER_HASH | Hash da oferta desse produto |
| CHECKOUT_SIGNING_SECRET | Segredo aleatório com pelo menos 32 caracteres; gere com um gerenciador de senhas |
| UPSTASH_REDIS_REST_URL | Endpoint REST do Redis conectado ao projeto |
| UPSTASH_REDIS_REST_TOKEN | Token REST do Redis |
| CHECKOUT_SITE_URL | https://lojadosgrau.vercel.app (sem barra final) |
| PAYMENTS_ENABLED | false durante configuração; true para ativar Pix real |

Marque credenciais como Sensitive na Vercel quando a opção estiver disponível. Depois de alterar variáveis, faça um novo deployment/redeploy: alterações de ambiente não modificam deploys já existentes.

## Redis

Conecte um banco Upstash Redis ao projeto pela área Storage/Marketplace da Vercel ou use um banco existente. Copie as variáveis REST com os nomes da tabela (se a integração gerar nomes diferentes, crie as variáveis correspondentes). Confira o plano e a região antes de criar o recurso. Não use token somente de leitura: a aplicação precisa registrar pedidos e bloqueios de criação.

O Redis guarda IDs, itens, valores e estados de pagamento por 30 dias. Nome, CPF, telefone e endereço não são gravados nele: esses dados são enviados à IronPay no momento de gerar o Pix. A identificação necessária à verificação do webhook é um HMAC, não o CPF aberto. Dados de entrega ficam no painel da IronPay.

## Regras configuradas

- Pix exclusivamente; não há formulário de cartão.
- PAC grátis, apresentado como entrega econômica.
- SEDEX R$ 9,90, estimativa de 1 a 2 dias úteis definida pelo lojista.
- O servidor recalcula itens e frete usando o catálogo/variações do repositório. Alterações de preço no navegador são ignoradas. O catálogo local é a fonte da loja; mantenha disponibilidade e preços atualizados antes de vender.
- O produto/oferta na IronPay deve ser compatível com pedidos físicos de valor variável. Os itens reais, quantidades e variações seguem no cart; o product_hash configurado é utilizado nesses itens. Confirme essa configuração na sua conta antes de ativar.
- Não há desconto automático por cupom.

## Confirmação e tentativas repetidas

O checkout mostra QR Code gerado no próprio servidor, Pix Copia e Cola e confirmação consultada na API da IronPay. O postback é informado automaticamente na criação da transação, com endereço /api/ironpay-webhook e chave por pedido. O webhook consulta a API autenticada para conferir valor e método; não aceita um simples status enviado por terceiros como prova de pagamento.

Um bloqueio persistente é gravado antes do POST de criação. Se a operadora demorar, responder com erro ou a conexão cair, a aplicação não repete automaticamente a criação. O mesmo pedido fica em verificação. Se a transação não tiver hash nem postback, confira o painel da IronPay antes de autorizar outra tentativa. Não apague bloqueios no Redis para forçar nova cobrança.

A documentação não informa ambiente de sandbox nem chave de idempotência do provedor. Os testes automatizados usam respostas simuladas; nenhuma cobrança real foi feita durante a implementação. Depois de configurar as variáveis, valide uma compra Pix autorizada e confira o recebimento na conta correta antes de divulgar o checkout.

## Fontes

- IronPay: https://docs.ironpayapp.com.br/ — criar e consultar transações, token em query parameter e payload Pix.
- Vercel: https://vercel.com/docs/environment-variables
- Upstash REST: https://upstash.com/docs/redis/features/restapi
- Logo Correios: https://commons.wikimedia.org/wiki/File:Correios.svg — autor Correios, marca mantida sem alteração.
