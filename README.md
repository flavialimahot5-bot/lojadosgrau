# Loja

Projeto estático com catálogo, coleções, páginas de produto, favoritos e carrinho local.

## Executar

Requer Node.js 22 ou superior. Não possui dependências npm.

```sh
npm run dev
```

Prévia: http://localhost:4173/

```sh
npm run check
```

O build valida `dist` e suas referências. Não executa os coletores nem sobrescreve as páginas capturadas.

## Git e Vercel

1. Use esta pasta como raiz do repositório GitHub. Se o repositório já tiver arquivos, integre as alterações sem substituir o histórico remoto.
2. Na Vercel, escolha **Add New → Project**, conecte o GitHub e importe o repositório.
3. Framework: **Other**. Build Command: **npm run build**. Output Directory: **dist**. Root Directory: a pasta que contém este README e `vercel.json`.
4. Publique. As próximas atualizações enviadas à branch de produção geram novos deployments.

`vercel.json` mantém as extensões `.html`, usadas pelo roteamento da loja. O servidor `server.mjs` é apenas para desenvolvimento local; a Vercel serve os arquivos de `dist`.

Não são necessárias variáveis de ambiente nesta etapa. Login, pedidos, cálculo de frete e pagamentos reais ainda precisam de backend; o gateway foi adiado. O carrinho e os favoritos ficam no navegador do visitante. Algumas imagens ainda usam endereços da loja de referência. A comparação visual integral de todos os layouts mobile continua pendente.

Documentação: https://vercel.com/docs/git e https://vercel.com/docs/builds/configure-a-build
