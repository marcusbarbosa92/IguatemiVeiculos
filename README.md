# Iguatemi Automóveis — site mobile

Site estático, mobile-first, para a Iguatemi Automóveis (Campinas - SP). Sem framework: HTML, CSS e JavaScript puros, publicáveis em qualquer hospedagem estática. A hospedagem prevista é o **Vercel** (`vercel.json`), com o GitHub Pages como alternativa.

Todos os dados do site são reais e foram extraídos de [iguatemiautomoveis.com.br](https://iguatemiautomoveis.com.br/) em 06/09/2026 (140 veículos, telefones, endereço, horários, redes sociais). O CNPJ do rodapé foi conferido na Receita Federal (BrasilAPI).

## Páginas

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Vídeo de fundo esmaecido, busca por marca/modelo/preço/ano, atalhos por categoria, últimas novidades (as mesmas que a loja destaca), marcas com logo, diferenciais, avaliações do Google (quando preenchidas), Instagram, mapa e contato |
| `estoque.html` | Lista completa com busca por texto, filtros (categoria, tipo, marca, modelo, preço, ano, câmbio, combustível, características), ordenação e estado na URL |
| `v/<id>.html` (e `veiculo.html?id=…`) | Galeria com swipe e tela cheia, especificações, opcionais, descrição, vídeo, WhatsApp, ligação, simulação de financiamento, compartilhar, veículos semelhantes. As páginas em `v/` são geradas a partir de `veiculo.html` com título, Open Graph (foto e preço) e JSON-LD próprios, para a prévia do link ficar certa no WhatsApp e no Google |
| `venda-seu-veiculo.html` | Formulário que monta a mensagem e abre o WhatsApp da loja |
| `financiamento.html` | Pré-análise (veículo, entrada, parcelas) enviada pelo WhatsApp |
| `quem-somos.html`, `contato.html`, `politica-de-privacidade.html`, `404.html` | Institucionais |

No celular há uma barra inferior fixa (Início, Estoque, WhatsApp, Vender, Contato). Todos os formulários abrem o WhatsApp com a mensagem pronta: nada é armazenado em servidor.

## Estrutura

```
assets/css/style.css      estilos (tokens no :root)
assets/js/store.js        dados da loja: telefones, endereço, horários, links, textos  ← edite aqui
assets/js/app.js          cabeçalho, menu, barra inferior, rodapé, cartões, utilitários
assets/js/home.js         página inicial
assets/js/estoque.js      listagem e filtros
assets/js/veiculo.js      página do veículo
assets/img/               logo, favicon, imagem de compartilhamento
data/vehicles.json        estoque completo (usado por veiculo.html?id= e pelos geradores)
data/index.json           estoque resumido (usado nas listagens)
data/categorias.json      categoria de carroceria por modelo (SUV, picape, sedan...)
data/avaliacoes.json      avaliações do Google, preenchidas à mão
assets/js/analytics.js    GA4 + Pixel da Meta e eventos de contato (IDs em store.js)
assets/thumbs/, assets/fotos/, assets/og/, assets/marcas/, assets/video/   imagens geradas e vídeo do hero
sw.js                     service worker (mude VERSAO para descartar o cache dos visitantes)
tests/                    validação de dados, parser do sync (fixtures reais) e fumaça no Chromium
scripts/sync-inventory.mjs  atualiza os dois JSON a partir do site atual
scripts/gerar-paginas.mjs   gera v/<id>.html (uma página por veículo), sitemap.xml e ajusta as URLs absolutas (canonical, Open Graph, robots.txt, 404.html)
scripts/build-vercel.mjs    build do Vercel: copia só o que é público para dist/ e regenera as páginas com o domínio do projeto
vercel.json               configuração do Vercel (build, pasta publicada, cabeçalhos de cache e segurança)
scripts/gerar-miniaturas.py gera assets/thumbs (capa 800 px), assets/fotos (cada foto em 160 px + as 6 primeiras em 640 px), assets/og (capa JPEG para a prévia do WhatsApp) e baixa assets/marcas
v/                        páginas geradas (não edite à mão: mude veiculo.html e rode npm run pages)
```

## Atualizar o estoque

O estoque vem do site atual (plataforma AutoCerto). Para sincronizar:

```bash
npm run sync        # ou: node scripts/sync-inventory.mjs
```

Requer Node 22+ e Python 3 com Pillow (`pip install pillow`) para as miniaturas. O primeiro script baixa a listagem e as páginas de detalhe, valida (título, preço, fotos, contagem) e só grava `data/vehicles.json` e `data/index.json` se tudo estiver consistente. Opções: `--out <dir>`, `--date AAAA-MM-DD`, `--from-dir <dir>` (modo offline para testes). O segundo regenera `v/*.html` e `sitemap.xml` (apaga as páginas de veículos que saíram do estoque). O terceiro gera as imagens locais; os nomes carregam a identidade da foto de origem, então uma capa trocada na loja vira uma miniatura nova automaticamente. Um anúncio com problema (sem fotos, preço ilegível) é pulado com aviso em `data/vehicles.json` (`avisos`), sem travar o resto. As URLs absolutas (canonical, Open Graph, `robots.txt`, `<base>` do `404.html`) seguem a opção `--site-url`; no Vercel isso é recalculado a cada deploy com o domínio do projeto, sem mexer no repositório.

O workflow `.github/workflows/sync-estoque.yml` faz isso automaticamente todo dia às 06:00 (Brasília) e também pode ser disparado manualmente em **Actions → Sincronizar estoque → Run workflow**. Ele commita as mudanças no branch padrão; o Vercel reage ao push e publica o estoque novo sozinho.

Os cartões, a faixa de miniaturas e as seis primeiras fotos da galeria usam imagens locais (`assets/thumbs`, `assets/fotos`), com a foto original como reserva se faltarem; as demais fotos da galeria só são baixadas quando o visitante mexe na galeria e chega perto delas, e a tela cheia usa as originais. As fotos grandes continuam hospedadas em `www.autocerto.com` (mesmo servidor usado pelo site atual). Se a loja deixar a AutoCerto, as fotos precisam ser copiadas para outro lugar e o campo `fotos` ajustado.

## Publicar no Vercel

O repositório já está pronto: `vercel.json` define o build (`node scripts/build-vercel.mjs`) e a pasta publicada (`dist/`). Não há dependências a instalar. Só falta conectar o repositório a um projeto no Vercel, o que exige a conta do dono:

1. Em [vercel.com/new](https://vercel.com/new), entre com a conta do GitHub e importe `marcusbarbosa92/IguatemiVeiculos` (na primeira vez o Vercel pede para instalar o app dele no GitHub e dar acesso ao repositório).
2. Não altere as configurações sugeridas: o `vercel.json` já cobre framework, build e pasta de saída. Clique em **Deploy**.
3. O site fica em `https://<nome-do-projeto>.vercel.app`. Na importação o Vercel escolhe o branch de produção nesta ordem: `main`, senão `master`, senão o branch padrão do repositório (hoje `claude/car-sales-mobile-site-m0ixyw`, porque não existe `main`). Cada push nesse branch, incluindo os commits da sincronização diária, gera um deploy novo; pushes em outros branches geram pré-visualizações com `noindex`. Se renomear o branch depois, ajuste em **Settings → Environments → Production → Branch Tracking**; o mais simples é renomear para `main` antes de conectar o Vercel.
4. Domínio próprio: **Settings → Domains** no projeto. As URLs absolutas do site passam a usar esse domínio no deploy seguinte, sem nenhuma alteração no código (o build lê `VERCEL_PROJECT_PRODUCTION_URL`, que o Vercel preenche com o domínio de produção mais curto). Se houver mais de um domínio e um redirecionar para o outro (ex.: `iguatemiautomoveis.com.br` → `www.iguatemiautomoveis.com.br`), defina a variável de ambiente `SITE_URL` no projeto com o endereço final; ela tem prioridade. Como o endereço entra nas páginas na hora do build, depois de anexar o domínio (ou criar `SITE_URL`) faça um **Redeploy** do último deploy de produção (**Deployments → ⋯ → Redeploy**): a sincronização diária só faz push quando o estoque muda, então sozinha ela pode demorar dias para gerar um deploy novo.

O build precisa saber o endereço do site e falha, de propósito, se não souber: no projeto, a opção **Settings → Environment Variables → Enable access to System Environment Variables** precisa estar ligada (é ela que expõe `VERCEL_PROJECT_PRODUCTION_URL`) ou a variável `SITE_URL` precisa existir. A mensagem de erro do build diz isso.

O build copia para `dist/` apenas o que é público (páginas, `assets/`, `data/`, `v/`, `sw.js`, manifest, `robots.txt`, `sitemap.xml`), regenera `v/*.html` e o sitemap com o domínio do projeto e confere o resultado antes de publicar. `dist/` não vai para o Git. Para reproduzir localmente: `npm run build -- --site-url https://meusite.vercel.app/` e depois `SMOKE_ROOT=dist node tests/smoke.mjs`.

**Plano do Vercel:** as [diretrizes de uso justo](https://vercel.com/docs/limits/fair-use-guidelines) restringem o plano Hobby (gratuito) a uso pessoal e não comercial; anunciar a venda de produtos ou serviços conta como uso comercial. Para o site da loja, o plano indicado é o Pro.

### GitHub Pages (alternativa)

1. O repositório nasceu vazio, então o primeiro branch enviado (`claude/car-sales-mobile-site-m0ixyw`) virou o padrão. Renomeie-o para `main` em **Settings → Branches** se quiser usar `pages.yml` no push (e faça isso antes de conectar o Vercel, ou ajuste o Branch Tracking lá).
2. Em **Settings → Pages**, escolha **Source: GitHub Actions** (o token do Actions não consegue ativar o Pages sozinho).
3. Publique em **Actions → Publicar no GitHub Pages → Run workflow** (ou a cada push em `main`). O site fica em `https://marcusbarbosa92.github.io/IguatemiVeiculos/`.
4. Para a sincronização diária também publicar no Pages, crie a variável de repositório `PUBLICAR_GITHUB_PAGES` = `true` (**Settings → Secrets and variables → Actions → Variables**). Em domínio próprio, defina também `SITE_URL` com a URL final: o sync regenera as URLs absolutas com ela. No subcaminho do GitHub Pages, `robots.txt` é ignorado pelos robôs (só vale na raiz do domínio); envie o sitemap pelo Search Console.

## Avaliações do Google

A home tem a seção "O que dizem nossos clientes" e a página do veículo mostra a nota, mas só quando `data/avaliacoes.json` estiver preenchido. O Google não permite ler as avaliações automaticamente sem uma chave da API do Places, então o preenchimento é manual, copiando do perfil da loja no Google:

```json
{
 "linkGoogle": "https://share.google/vTeglaWUinRUkXE20",
 "atualizadoEm": "2026-09-06",
 "nota": 4.8,
 "totalAvaliacoes": 120,
 "avaliacoes": [
  { "nome": "Nome como aparece no Google", "estrelas": 5, "data": "ago. de 2026", "texto": "Texto da avaliação, sem alterações." }
 ]
}
```

Use apenas avaliações reais e o texto como está publicado. Enquanto `nota` for `null` ou a lista estiver vazia, nada aparece.

## Testes

```bash
npm run test:dados   # consistência de data/*.json, v/*.html, sitemap, categorias e miniaturas + parser do sync contra fixtures reais + build do Vercel
npm test             # o anterior + teste de fumaça no Chromium (precisa de `npm i --no-save playwright@1.56.1` e `npx playwright install chromium`)
```

O workflow `.github/workflows/testes.yml` roda tudo a cada push. `tests/build.test.mjs` roda o build do Vercel com um domínio de exemplo e confere que só o público vai para `dist/`, que as URLs absolutas seguem o domínio e que o repositório não é alterado.

## Rodar localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080/
```

Qualquer servidor estático serve. Abrir os arquivos direto com `file://` não funciona porque as páginas carregam os JSON via `fetch`.

## O que ficou de fora (de propósito)

- Ficha de financiamento completa (CPF, RG, renda, etc.): sem back-end não há como receber esses dados com segurança. A pré-análise vai pelo WhatsApp e o consultor pede o restante.
- Simulador de parcelas com juros: não há taxa oficial da loja para usar; inventar uma seria enganar o cliente.
- Analytics: já incluído com os mesmos IDs do site atual (GA4 `G-F35L06L32H` e Pixel `410840736561439`, em `assets/js/store.js`). O aviso de cookies tem "Aceitar" e "Só o necessário": sem aceite, o GA4 roda em Consent Mode (sem cookies) e o Pixel não carrega. Para desligar tudo, deixe os dois IDs como `null`.
- Modelo novo no estoque: aparece normalmente; para entrar no filtro por categoria, adicione a chave `MARCA|MODELO` em `data/categorias.json` (o teste de dados avisa quais faltam).
