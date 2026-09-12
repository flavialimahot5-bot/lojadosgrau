# Pix IronPay: três variáveis obrigatórias

Em Vercel → lojadosgrau → Settings → Environment Variables, cadastre em Production:

| Variável | Valor |
|---|---|
| IRONPAY_API_TOKEN | Token da API IronPay |
| IRONPAY_PRODUCT_HASH | Hash do produto cadastrado |
| IRONPAY_OFFER_HASH | Hash da oferta desse produto |

Não compartilhe os valores no chat ou GitHub. Marque como Sensitive quando disponível. Não use prefixos PUBLIC_, VITE_ ou NEXT_PUBLIC_. Depois de cadastrar/alterar, faça redeploy. Credenciais somente em Production evitam cobrança em deploys Preview.

Apenas essas três variáveis são necessárias. O servidor deriva a assinatura dos recibos de uma chave privada e usa o domínio de produção da loja. GET /api/pix informa ready sem expor credenciais; ready confirma a presença das variáveis, não a validade da conta/oferta na operadora.

## Funcionamento

- Pix exclusivamente, PAC grátis e SEDEX R$ 9,90. O prazo do SEDEX aparece como estimativa de 1 a 2 dias úteis definida pelo lojista; PAC como entrega econômica.
- O servidor recalcula preços e variações pelo catálogo local, ignorando preços enviados pelo navegador. Mantenha catálogo/estoque atualizados.
- Produto e oferta IronPay precisam aceitar os itens físicos e os valores dos pedidos. Os itens e frete são enviados separadamente no cart, utilizando o produto configurado.
- Nome, CPF, e-mail, telefone e endereço seguem do servidor para a IronPay. Não são gravados em sessionStorage. O token da operadora e a resposta bruta nunca são enviados ao navegador.
- A resposta entrega QR Code, Copia e Cola e um recibo assinado de acesso ao pedido. O navegador guarda esse recibo na sessão. Qualquer instância Vercel consegue consultar a transação na IronPay com ele.
- O pagamento só aparece confirmado depois da resposta autenticada da IronPay, conferindo hash, valor e método. Sem banco adicional, os pedidos ficam na IronPay; não há processamento independente de estoque/expedição nem confirmação por webhook local.
- A validade do Pix exibida vem da resposta da operadora. Não prometemos 30 minutos sem confirmação da API.

## Repetições e falhas de conexão

O botão bloqueia cliques repetidos e o servidor agrupa criações simultâneas na mesma instância. O navegador não repete automaticamente o POST de criação. Em resposta ambígua, orienta consultar o pedido antes de gerar outro Pix.

Sem armazenamento durável nem idempotência documentada pela IronPay, não há garantia de deduplicação entre instâncias diferentes. Se a conexão cair antes de receber o recibo, consulte o painel da IronPay antes de iniciar outro pedido. A limitação de requisições em memória também é por instância.

A implementação anterior com Redis continua opcional para quem já possui UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN; nesse modo há bloqueio persistente e webhook verificado pela API. Não é necessário contratar Redis para habilitar este checkout. CHECKOUT_SIGNING_SECRET e CHECKOUT_SITE_URL são opcionais; o segundo só precisa mudar ao trocar o domínio. PAYMENTS_ENABLED=false é um bloqueio opcional explícito: remova-o ou use true se ele tiver sido cadastrado antes.

## Validação

Testes usam respostas simuladas, sem criar cobranças reais. Antes de divulgar o checkout, valide uma compra autorizada e confira valor, recebedor e confirmação no painel da IronPay. A documentação consultada não oferece sandbox nem chave de idempotência.

Fonte: https://docs.ironpayapp.com.br/ (criar/consultar transações Pix).
Diagnóstico: códigos IRONPAY_HTTP_401/403 indicam autenticação recusada; IRONPAY_HTTP_422 indica validação rejeitada (os nomes de campos permitidos aparecem quando disponíveis). Os logs retêm apenas status e nomes de campos, sem resposta bruta nem credenciais. IRONPAY_RESPONSE_UNCONFIRMED indica comunicação sem confirmação: confira no painel antes de repetir. A presença das variáveis não comprova que a oferta aceita o valor enviado; confirme a configuração da oferta com a IronPay quando o erro apontar valor/oferta.
