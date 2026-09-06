#!/usr/bin/env python3
"""
sync-instagram.py — últimas publicações do Instagram da loja em data/instagram.json + assets/instagram/.

Usa a API oficial (Instagram API com login do Instagram, graph.instagram.com). Precisa de um token de
acesso de longa duração da conta da loja na variável de ambiente INSTAGRAM_TOKEN. Como gerar: README,
seção "Instagram". Sem o token, o script não faz nada e o arquivo atual é mantido (pode ser preenchido à mão).

O Instagram não expõe as publicações sem login (perfil, embed e endpoints internos exigem sessão),
por isso não há caminho automático sem o token.

Uso: INSTAGRAM_TOKEN=... python3 scripts/sync-instagram.py [--limit 6]
"""
import io
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "instagram.json"
IMG_DIR = ROOT / "assets" / "instagram"
API = "https://graph.instagram.com/v21.0"
WIDTH = 480  # o grid mostra até ~200 px por foto; 480 cobre telas 2x
LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 6


def get(url, timeout=30):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "iguatemi-site/1.0"}), timeout=timeout) as r:
        return r.read()


def main():
    token = os.environ.get("INSTAGRAM_TOKEN", "").strip()
    atual = json.loads(JSON_PATH.read_text(encoding="utf-8")) if JSON_PATH.exists() else {}
    if not token:
        print("sync-instagram: sem INSTAGRAM_TOKEN; data/instagram.json mantido como está "
              f"({len(atual.get('publicacoes', []))} publicação(ões)).")
        return 0

    q = urllib.parse.urlencode({
        "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
        "limit": LIMIT, "access_token": token,
    })
    try:
        resp = json.loads(get(f"{API}/me/media?{q}"))
    except Exception as e:  # noqa: BLE001
        print(f"sync-instagram: não consegui ler a API ({e}); mantendo o arquivo atual. Token vencido? Ele dura 60 dias.")
        return 0
    if "error" in resp:
        print(f"sync-instagram: API respondeu erro: {resp['error'].get('message')}; mantendo o arquivo atual.")
        return 0

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    pubs = []
    for m in resp.get("data", []):
        src = m.get("thumbnail_url") if m.get("media_type") == "VIDEO" else m.get("media_url")
        if not src or not m.get("permalink"):
            continue
        out = IMG_DIR / f"{m['id']}.webp"
        try:
            if not out.exists():
                img = ImageOps.exif_transpose(Image.open(io.BytesIO(get(src)))).convert("RGB")
                # quadrado central, como no grid do Instagram
                lado = min(img.size)
                img = img.crop(((img.width - lado) // 2, (img.height - lado) // 2, (img.width + lado) // 2, (img.height + lado) // 2))
                if lado > WIDTH:
                    img = img.resize((WIDTH, WIDTH), Image.LANCZOS)
                img.save(out, "WEBP", quality=78, method=6)
        except Exception as e:  # noqa: BLE001
            print(f"sync-instagram: imagem da publicação {m['id']} falhou ({e}); pulando")
            continue
        pubs.append({
            "id": m["id"], "url": m["permalink"], "imagem": f"assets/instagram/{out.name}",
            "tipo": {"VIDEO": "video", "CAROUSEL_ALBUM": "album"}.get(m.get("media_type"), "foto"),
            "legenda": (m.get("caption") or "").strip()[:300], "data": (m.get("timestamp") or "")[:10],
        })

    # apaga imagens que saíram da lista
    manter = {p["imagem"].split("/")[-1] for p in pubs}
    for f in IMG_DIR.glob("*.webp"):
        if f.name not in manter:
            f.unlink()

    novo = {
        "_como_preencher": atual.get("_como_preencher", ""),
        "perfil": atual.get("perfil", "iguatemiautomoveis"),
        "url": atual.get("url", "https://www.instagram.com/iguatemiautomoveis/"),
        "atualizadoEm": date.today().isoformat(),
        "publicacoes": pubs,
    }
    JSON_PATH.write_text(json.dumps(novo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"sync-instagram: {len(pubs)} publicação(ões) em data/instagram.json.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
