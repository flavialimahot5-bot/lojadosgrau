# Estado da loja

Atualizado: 2026-09-12T04:19:01.335Z

1181 páginas de produtos; 132 coleções com produtos. Fila de variações concluída: 606/606 arquivos; catálogo com 626 produtos contendo grupos de opções.

Conferido neste avanço: cards da coleção; menu Categorias → Kits (66 produtos); Whey 185 com 19 sabores e escolha sincronizada; carrinho Chocolate R$174,90; Whey 4074 Chocolate 750g por R$122,90, duas unidades; galeria da legging 4575 com 7 fotos, abrir, avançar e fechar. Item preexistente no carrinho preservado.

Pendente: comparação visual integral de todos os layouts mobile, demais controles de conteúdo e páginas institucionais/conta. Não afirmar 100% de paridade. Gateway adiado pelo usuário.

Publicação Sites ainda retorna project_not_found (404). Alterações disponíveis localmente.

Prévia: node server.mjs na porta 4173. Não executar build antigo/store-build sobre dist sem preservar as alterações.

Destino solicitado: Vercel, via https://github.com/flavialimahot5-bot/lojadosgrau.git. Remote origin configurado e branch main. Configuração vercel.json, package.json, validação estática e README adicionados. npm run check passou: 1181 produtos, 2597 arquivos e zero referências locais ausentes. Push ainda não realizado: revisão automática exigiu autorização explícita para enviar o projeto completo ao repositório externo.


Atualização: autenticação Git concluída com flavialimahot5-bot. Projeto enviado para origin/main e commit remoto conferido. Este repositório local usa a conta Flavia nos próximos envios e commits. Configuração da Vercel incluída; implantação na Vercel ainda não realizada.


Correção mobile: colunas de roupa passam a ocupar a largura completa, galeria aparece no celular e cards informativos têm imagem/texto/botão alinhados. Corrigidos gutters e overflow horizontal. Validação em 24 cenários (8 páginas x 320/390/430px), sem falhas; relatório reference/mobile-layout-regression.json. Usuário autoriza enviar as próximas correções ao GitHub para deploy automático na Vercel.

Correção de compra e avaliações (12/09/2026): botões e seletores de tamanho alinhados no mobile; layout local do widget de avaliações com cinco estrelas sobrepostas, histograma, ícones e comentários sem quebra de palavras. Testados 16 cenários (legging, macaquinho e kit em 320/390/430/500px), todos aprovados; relatório reference/controls-reviews-regression.json. npm run check sem erros. Vercel em produção: https://lojadosgrau.vercel.app, com deploy automático via main.
Galeria e cabeçalhos (12/09/2026): visualizador compartilhado substituído por dialog no body, uma imagem por vez, sem refoco ao trocar fotos e com touch-action manipulation nas setas. Cabeçalhos antigos isolados e cabeçalho mobile comum adicionado em pm/72,3384,4163,4378,4508. Menu móvel ligado a todos os botões de cabeçalho. Auditoria das 1187 páginas: nenhuma com menu legado sem isolamento e todas carregam a correção compartilhada. 27 cenários de navegador aprovados (9 páginas em 320/390/430), incluindo troca/fechamento da galeria e abertura intencional do menu. Não houve teste em iPhone físico.
