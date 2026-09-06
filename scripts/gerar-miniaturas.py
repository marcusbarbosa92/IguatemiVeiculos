#!/usr/bin/env python3
"""
gerar-miniaturas.py

Gera as imagens locais que o site usa no lugar das fotos originais (~400 KB cada) da AutoCerto:
  assets/thumbs/<id>-<capaId>.webp   capa em 800 px (cartões e primeira foto da galeria)
  assets/og/<id>-<capaId>.jpg        capa em 960x720 JPEG (prévia do link no WhatsApp/Facebook, que exige < 300 KB)
  assets/fotos/<id>/<foto>.webp       cada foto em 160 px (faixa de miniaturas da galeria)
  assets/fotos/<id>/<foto>-640.webp   as 6 primeiras fotos em 640 px (galeria no celular; as demais vêm da AutoCerto sob demanda)
  assets/marcas/<chave>.webp          logo da marca
Nomes carregam a identidade da foto de origem: se a loja trocar a capa, a miniatura antiga é apagada
e a nova gerada. Fotos de veículos que saíram do estoque são removidas.

Requer Python 3.9+ e Pillow (pip install pillow). Roda depois do sync:
    python3 scripts/gerar-miniaturas.py [--force]
"""
import concurrent.futures as cf
import io
import json
import re
import shutil
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "vehicles.json"
THUMBS = ROOT / "assets" / "thumbs"
FOTOS = ROOT / "assets" / "fotos"
MARCAS = ROOT / "assets" / "marcas"
OG = ROOT / "assets" / "og"
CAPA_W, CAPA_Q = 800, 78
OG_W, OG_Q = 960, 76
FOTO_W, FOTO_Q = 160, 70
GAL_W, GAL_Q, GAL_N = 640, 72, 6
UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36"
FORCE = "--force" in sys.argv


def foto_id(url):
    return re.sub(r"[^A-Za-z0-9_-]", "", url.split("/")[-1].rsplit(".", 1)[0])


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


def resize_save(data, out, width, quality):
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix == ".jpg":
        img.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        img.save(out, "WEBP", quality=quality, method=6)


_cache = {}
def job(kind, url, out, width, quality):
    if out.exists() and not FORCE:
        return "ok"
    if url not in _cache:
        _cache[url] = fetch(url)
    resize_save(_cache[url], out, width, quality)
    if kind == "foto":  # a mesma foto pode ser usada pela versão de 640 px e pela capa/OG logo em seguida
        _cache.pop(url, None)
    return "novo"


def marca_key(marca, tipo):
    return re.sub(r"[^a-z0-9]", "", marca.lower()) + ("_moto" if tipo == "moto" else "")


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    veiculos = doc["veiculos"]
    for d in (THUMBS, FOTOS, MARCAS, OG):
        d.mkdir(parents=True, exist_ok=True)

    # limpeza: capas antigas, veículos vendidos e fotos removidas
    esperadas = {f"{v['id']}-{foto_id(v['capa'])}" for v in veiculos}
    removidos = 0
    for f in THUMBS.glob("*.webp"):
        if f.stem not in esperadas:
            f.unlink(); removidos += 1
    for f in OG.glob("*.jpg"):
        if f.stem not in esperadas:
            f.unlink(); removidos += 1
    ids = {str(v["id"]) for v in veiculos}
    for d in FOTOS.iterdir():
        if d.is_dir() and d.name not in ids:
            shutil.rmtree(d); removidos += 1
    for v in veiculos:
        d = FOTOS / str(v["id"])
        if d.is_dir():
            atuais = {f"{foto_id(f)}.webp" for f in v["fotos"]} | {f"{foto_id(f)}-640.webp" for f in v["fotos"][:GAL_N]}
            for f in d.glob("*.webp"):
                if f.name not in atuais:
                    f.unlink(); removidos += 1

    tarefas = []
    for v in veiculos:
        tarefas.append(("capa", v["capa"], THUMBS / f"{v['id']}-{foto_id(v['capa'])}.webp", CAPA_W, CAPA_Q))
        tarefas.append(("og", v["capa"], OG / f"{v['id']}-{foto_id(v['capa'])}.jpg", OG_W, OG_Q))
        for i, f in enumerate(v["fotos"]):
            if i < GAL_N:
                tarefas.append(("galeria", f, FOTOS / str(v["id"]) / f"{foto_id(f)}-640.webp", GAL_W, GAL_Q))
            tarefas.append(("foto", f, FOTOS / str(v["id"]) / f"{foto_id(f)}.webp", FOTO_W, FOTO_Q))
    novos, erros = 0, []
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(job, *t): t for t in tarefas}
        for fut in cf.as_completed(futs):
            t = futs[fut]
            try:
                if fut.result() == "novo":
                    novos += 1
            except Exception as e:  # noqa: BLE001
                erros.append(f"{t[0]} {t[1]}: {e}")

    keys = sorted({marca_key(v["marca"], v["tipo"]) for v in veiculos})
    logos_novos = 0
    for k in keys:
        out = MARCAS / f"{k}.webp"
        try:
            if not out.exists() or FORCE:
                out.write_bytes(fetch(f"https://www.autocerto.com/fabricantes/{k}.webp")); logos_novos += 1
        except Exception as e:  # noqa: BLE001
            erros.append(f"logo {k}: {e}")

    kb_capas = sum(f.stat().st_size for f in THUMBS.glob("*.webp")) // 1024
    kb_fotos = sum(f.stat().st_size for f in FOTOS.rglob("*.webp")) // 1024
    kb_og = sum(f.stat().st_size for f in OG.glob("*.jpg")) // 1024
    grandes = [f.name for f in OG.glob("*.jpg") if f.stat().st_size > 300_000]
    print(f"Capas: {len(veiculos)} ({kb_capas} KB). OG: {kb_og} KB{' (ACIMA de 300 KB: ' + ', '.join(grandes) + ')' if grandes else ''}. Fotos em 160 px: {sum(len(v['fotos']) for v in veiculos)} ({kb_fotos} KB). Novas: {novos}. Removidas: {removidos}. Logos: {len(keys)} ({logos_novos} novos).")
    if erros:
        # Uma miniatura que falhe não derruba o sync: o site usa a foto original como reserva.
        print("Avisos (miniaturas não geradas, o site usa a foto original):\n  " + "\n  ".join(erros[:30]))
    if novos == 0 and len(erros) >= len(tarefas):
        print("Nenhuma miniatura pôde ser gerada; verifique a rede.")
        sys.exit(1)


if __name__ == "__main__":
    main()
