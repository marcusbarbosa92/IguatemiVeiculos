# Iguatemi Automóveis — site mobile

Site estático, mobile-first, para a Iguatemi Automóveis (Campinas - SP). Sem framework e sem etapa de build: HTML, CSS e JavaScript puros, publicáveis em qualquer hospedagem estática (GitHub Pages, Vercel, Netlify, etc.).

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
scripts/gerar-paginas.mjs   gera v/<id>.html (uma página por veículo) e sitemap.xml
scripts/gerar-miniaturas.py gera assets/thumbs (capa 800 px), assets/fotos (cada foto em 160 px + as 6 primeiras em 640 px), assets/og (capa JPEG para a prévia do WhatsApp) e baixa assets/marcas
v/                        páginas geradas (não edite à mão: mude veiculo.html e rode npm run pages)
```

## Atualizar o estoque

O estoque vem do site atual (plataforma AutoCerto). Para sincronizar:

```bash
npm run sync        # ou: node scripts/sync-inventory.mjs
```

Requer Node 22+ e Python 3 com Pillow (`pip install pillow`) para as miniaturas. O primeiro script baixa a listagem e as páginas de detalhe, valida (título, preço, fotos, contagem) e só grava `data/vehicles.json` e `data/index.json` se tudo estiver consistente. Opções: `--out <dir>`, `--date AAAA-MM-DD`, `--from-dir <dir>` (modo offline para testes). O segundo regenera `v/*.html` e `sitemap.xml` (apaga as páginas de veículos que saíram do estoque). O terceiro gera as imagens locais; os nomes carregam a identidade da foto de origem, então uma capa trocada na loja vira uma miniatura nova automaticamente. Um anúncio com problema (sem fotos, preço ilegível) é pulado com aviso em `data/vehicles.json` (`avisos`), sem travar o resto. Se o site for publicado em outro domínio, rode `node scripts/gerar-paginas.mjs --site-url https://seu-dominio/`.

O workflow `.github/workflows/sync-estoque.yml` faz isso automaticamente todo dia às 06:00 (Brasília) e também pode ser disparado manualmente em **Actions → Sincronizar estoque → Run workflow**. Ele commita as mudanças no branch padrão, o que dispara a publicação.

Os cartões, a faixa de miniaturas e as seis primeiras fotos da galeria usam imagens locais (`assets/thumbs`, `assets/fotos`), com a foto original como reserva se faltarem; as demais fotos da galeria só são baixadas quando o visitante mexe na galeria e chega perto delas, e a tela cheia usa as originais. As fotos grandes continuam hospedadas em `www.autocerto.com` (mesmo servidor usado pelo site atual). Se a loja deixar a AutoCerto, as fotos precisam ser copiadas para outro lugar e o campo `fotos` ajustado.

## Publicar no GitHub Pages

1. O repositório nasceu vazio, então o primeiro branch enviado (`claude/car-sales-mobile-site-m0ixyw`) virou o padrão. **Renomeie-o para `main`** em **Settings → Branches** (é nele que a sincronização diária vai commitar).
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. Todo push em `main` roda `.github/workflows/pages.yml` e publica o site em `https://marcusbarbosa92.github.io/IguatemiVeiculos/`. Também dá para disparar manualmente em **Actions → Publicar no GitHub Pages → Run workflow**, escolhendo o branch.

Se for usar um domínio próprio: (1) crie a variável de repositório `SITE_URL` com a URL final, usada pelo sync ao gerar `v/*.html` e `sitemap.xml`; (2) troque as URLs absolutas de `canonical`/`og:image` nos HTML da raiz e o prefixo `/IguatemiVeiculos/` em `404.html`; (3) só então `robots.txt` e a diretiva `Sitemap` passam a valer, porque robôs só leem `robots.txt` na raiz do domínio (no GitHub Pages em subcaminho ele é ignorado; envie o sitemap pelo Search Console).

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
npm run test:dados   # consistência de data/*.json, v/*.html, sitemap, categorias e miniaturas + parser do sync contra fixtures reais
npm test             # o anterior + teste de fumaça no Chromium (precisa de `npm i --no-save playwright@1.56.1` e `npx playwright install chromium`)
```

O workflow `.github/workflows/testes.yml` roda os dois a cada push.

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
