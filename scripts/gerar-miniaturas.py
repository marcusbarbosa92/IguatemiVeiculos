#!/usr/bin/env python3
"""
gerar-miniaturas.py

Gera miniaturas WebP (640 px de largura) da foto de capa de cada veículo em
assets/thumbs/<id>.webp e baixa os logos das marcas para assets/marcas/<chave>.webp.
As páginas usam a miniatura nos cartões (com a foto original como reserva) e as
fotos grandes continuam vindo da AutoCerto só na galeria do veículo.

Requer Python 3.9+ e Pillow (pip install pillow). Roda depois do sync:
    python3 scripts/gerar-miniaturas.py [--force]
"""
import concurrent.futures as cf
import io
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "vehicles.json"
THUMBS = ROOT / "assets" / "thumbs"
MARCAS = ROOT / "assets" / "marcas"
WIDTH = 640
QUALITY = 78
UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
FORCE = "--force" in sys.argv


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"falha ao baixar {url}: {last}")


def thumb(v):
    out = THUMBS / f"{v['id']}.webp"
    if out.exists() and not FORCE:
        return "ok"
    img = Image.open(io.BytesIO(fetch(v["capa"])))
    img = ImageOps.exif_transpose(img).convert("RGB")
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    img.save(out, "WEBP", quality=QUALITY, method=6)
    return "novo"


def marca_key(marca, tipo):
    key = re.sub(r"[^a-z0-9]", "", marca.lower())
    return key + ("_moto" if tipo == "moto" else "")


def logo(key):
    out = MARCAS / f"{key}.webp"
    if out.exists() and not FORCE:
        return "ok"
    out.write_bytes(fetch(f"https://www.autocerto.com/fabricantes/{key}.webp"))
    return "novo"


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    veiculos = doc["veiculos"]
    THUMBS.mkdir(parents=True, exist_ok=True)
    MARCAS.mkdir(parents=True, exist_ok=True)

    # remove miniaturas de veículos que saíram do estoque
    atuais = {f"{v['id']}.webp" for v in veiculos}
    removidas = 0
    for f in THUMBS.glob("*.webp"):
        if f.name not in atuais:
            f.unlink()
            removidas += 1

    novos, erros = 0, []
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for v, fut in [(v, ex.submit(thumb, v)) for v in veiculos]:
            try:
                if fut.result() == "novo":
                    novos += 1
            except Exception as e:  # noqa: BLE001
                erros.append(f"{v['id']}: {e}")

    keys = sorted({marca_key(v["marca"], v["tipo"]) for v in veiculos})
    logos_novos = 0
    for k in keys:
        try:
            if logo(k) == "novo":
                logos_novos += 1
        except Exception as e:  # noqa: BLE001
            erros.append(f"logo {k}: {e}")

    total_kb = sum(f.stat().st_size for f in THUMBS.glob("*.webp")) // 1024
    print(f"Miniaturas: {len(veiculos)} veículos, {novos} novas, {removidas} removidas, {total_kb} KB no total.")
    print(f"Logos: {len(keys)} marcas, {logos_novos} novos.")
    if erros:
        print("Erros:\n  " + "\n  ".join(erros))
        sys.exit(1)


if __name__ == "__main__":
    main()
