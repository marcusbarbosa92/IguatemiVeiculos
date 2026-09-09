#!/usr/bin/env bash
# Sincronização completa do estoque, seguida de commit e push quando algo mudou.
#
# Faz, em ordem: leitura do estoque na AutoCerto (sync-inventory.mjs), páginas dos veículos e sitemap
# (gerar-paginas.mjs), miniaturas (gerar-miniaturas.py), vídeo do YouTube (sync-youtube.mjs), Instagram
# (sync-instagram.py, só com INSTAGRAM_TOKEN), validação (tests/validar-dados.mjs) e o commit.
#
# Uso: scripts/sincronizar.sh [--site-url URL] [--sem-commit]
#   --site-url    endereço do site para canonical/sitemap (padrão: SITE_URL ou o endereço do Vercel)
#   --sem-commit  faz tudo, mostra o resultado e não commita (para testar localmente)
# Imprime "mudou=true" ou "mudou=false" na última linha. Usado pelo workflow sync-estoque.yml.
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${SITE_URL:-https://iguatemi-veiculos.vercel.app/}"
SEM_COMMIT="${SEM_COMMIT:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --site-url) SITE_URL="$2"; shift 2 ;;
    --sem-commit) SEM_COMMIT=1; shift ;;
    *) echo "argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

node scripts/sync-inventory.mjs
node scripts/gerar-paginas.mjs --site-url "$SITE_URL"
python3 scripts/gerar-miniaturas.py
node scripts/sync-youtube.mjs
python3 scripts/sync-instagram.py
node tests/validar-dados.mjs

# o que pode ter mudado (assets/instagram só existe com INSTAGRAM_TOKEN; um pathspec inexistente é ignorado
# pelo git diff, mas faria o git add falhar, por isso ele é adicionado à parte)
RASTREADOS=(data v sitemap.xml robots.txt ':(glob)*.html' assets/thumbs assets/fotos assets/og assets/marcas)
# ignora linhas que mudam todo dia (data de atualização e lastmod do sitemap)
if git diff --quiet -I 'atualizadoEm' -I '<lastmod>' -- "${RASTREADOS[@]}" assets/instagram \
   && [ -z "$(git ls-files --others --exclude-standard -- v assets/thumbs assets/fotos assets/og assets/marcas assets/instagram)" ]; then
  echo "Estoque sem mudanças."
  git checkout -q -- data v sitemap.xml ':(glob)*.html' 2>/dev/null || true
  echo "mudou=false"
  exit 0
fi

if [ -n "$SEM_COMMIT" ]; then
  git status --short | head -20
  echo "mudou=true (sem commit: modo de teste)"
  exit 0
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add "${RASTREADOS[@]}"
[ -d assets/instagram ] && git add assets/instagram
git commit -q -m "chore: sincroniza estoque ($(date -u +%Y-%m-%d) $(date -u +%H:%M) UTC)"
git pull -q --rebase
git push -q
echo "mudou=true"
