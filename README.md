# Iguatemi Automóveis — site mobile

Site estático, mobile-first, para a Iguatemi Automóveis (Campinas - SP). Sem framework e sem etapa de build: HTML, CSS e JavaScript puros, publicáveis em qualquer hospedagem estática (GitHub Pages, Vercel, Netlify, etc.).

Todos os dados do site são reais e foram extraídos de [iguatemiautomoveis.com.br](https://iguatemiautomoveis.com.br/) em 06/09/2026 (140 veículos, telefones, endereço, horários, redes sociais). O CNPJ do rodapé foi conferido na Receita Federal (BrasilAPI).

## Páginas

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Busca por marca/modelo/preço/ano, atalhos, últimas novidades, marcas, diferenciais, mapa e contato |
| `estoque.html` | Lista completa com busca por texto, filtros (tipo, marca, modelo, preço, ano, câmbio, combustível, características), ordenação e estado na URL |
| `veiculo.html?id=…` | Galeria com swipe e tela cheia, especificações, opcionais, descrição, vídeo, WhatsApp, ligação, simulação de financiamento, compartilhar, veículos semelhantes |
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
data/vehicles.json        estoque completo (usado na página do veículo)
data/index.json           estoque resumido (usado nas listagens)
scripts/sync-inventory.mjs  atualiza os dois JSON a partir do site atual
```

## Atualizar o estoque

O estoque vem do site atual (plataforma AutoCerto). Para sincronizar:

```bash
npm run sync        # ou: node scripts/sync-inventory.mjs
```

Requer Node 22+. O script baixa a listagem e as páginas de detalhe, valida (título, preço, fotos, contagem) e só grava `data/vehicles.json` e `data/index.json` se tudo estiver consistente. Opções: `--out <dir>`, `--date AAAA-MM-DD`, `--from-dir <dir>` (modo offline para testes).

O workflow `.github/workflows/sync-estoque.yml` faz isso automaticamente todo dia às 06:00 (Brasília) e também pode ser disparado manualmente em **Actions → Sincronizar estoque → Run workflow**. Ele commita as mudanças no branch padrão, o que dispara a publicação.

As fotos dos veículos continuam hospedadas em `www.autocerto.com` (mesmo servidor usado pelo site atual). Se a loja deixar a AutoCerto, as fotos precisam ser copiadas para outro lugar e o campo `fotos` ajustado.

## Publicar no GitHub Pages

1. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
2. Faça merge deste branch em `main`. O workflow `.github/workflows/pages.yml` publica o site em `https://marcusbarbosa92.github.io/IguatemiVeiculos/`.

Se for usar um domínio próprio, troque as URLs absolutas de `og:image`/`canonical` nos HTML (hoje apontam para o endereço acima) e o prefixo `/IguatemiVeiculos/` em `404.html`.

## Rodar localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080/
```

Qualquer servidor estático serve. Abrir os arquivos direto com `file://` não funciona porque as páginas carregam os JSON via `fetch`.

## O que ficou de fora (de propósito)

- Ficha de financiamento completa (CPF, RG, renda, etc.): sem back-end não há como receber esses dados com segurança. A pré-análise vai pelo WhatsApp e o consultor pede o restante.
- Simulador de parcelas com juros: não há taxa oficial da loja para usar; inventar uma seria enganar o cliente.
- Analytics e pixel: o site atual usa Google Analytics e Meta Pixel. Se quiser manter, adicione as tags no `<head>` das páginas e revise a política de privacidade.
