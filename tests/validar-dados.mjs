#!/usr/bin/env node
/* Valida a consistência dos dados e dos arquivos gerados. Sem dependências: node tests/validar-dados.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const erros = [];
const check = (cond, msg) => { if (!cond) erros.push(msg); };

const veic = read('data/vehicles.json');
const idx = read('data/index.json');
const cats = read('data/categorias.json');
const aval = read('data/avaliacoes.json');
const list = veic.veiculos;

check(Array.isArray(list) && list.length > 0, 'vehicles.json sem veículos');
check(veic.total === list.length, `total (${veic.total}) difere da lista (${list.length})`);
check(/^\d{4}-\d{2}-\d{2}$/.test(veic.atualizadoEm), 'atualizadoEm inválido');
const ids = new Set();
for (const v of list) {
  const tag = `veículo ${v.id} (${v.marca} ${v.modelo})`;
  check(Number.isInteger(v.id) && v.id > 0, `${tag}: id inválido`);
  check(!ids.has(v.id), `${tag}: id duplicado`); ids.add(v.id);
  check(['carro', 'moto'].includes(v.tipo), `${tag}: tipo inválido`);
  check(v.marca && v.modelo, `${tag}: marca/modelo vazio`);
  check(typeof v.preco === 'number' && v.preco > 1000, `${tag}: preço inválido (${v.preco})`);
  check(Number.isInteger(v.km) && v.km >= 0, `${tag}: km inválido`);
  check(v.anoModelo >= v.anoFabricacao && v.anoFabricacao > 1950 && v.anoModelo <= new Date().getFullYear() + 1, `${tag}: anos inválidos`);
  check(Array.isArray(v.fotos) && v.fotos.length > 0, `${tag}: sem fotos`);
  check(v.fotos.every((f) => /^https:\/\/www\.autocerto\.com\//.test(f)), `${tag}: foto com host inesperado`);
  check(/^https:\/\/www\.autocerto\.com\//.test(v.capa), `${tag}: capa com host inesperado`);
  check(Array.isArray(v.caracteristicas) && Array.isArray(v.opcionais) && Array.isArray(v.descricao), `${tag}: listas ausentes`);
  check(v.video === null || /^[A-Za-z0-9_-]{6,20}$/.test(v.video), `${tag}: id de vídeo inválido`);
  check(fs.existsSync(path.join(ROOT, 'v', `${v.id}.html`)), `${tag}: falta v/${v.id}.html (rode npm run pages)`);
  check(v.tipo === 'moto' || cats.modelos[`${v.marca}|${v.modelo}`], `${tag}: sem categoria em data/categorias.json`);
}
for (const id of veic.destaques || []) check(ids.has(id), `destaque ${id} não está no estoque`);
check(idx.total === list.length && idx.veiculos.length === list.length, 'index.json com total diferente de vehicles.json');
const byId = new Map(list.map((v) => [v.id, v]));
for (const e of idx.veiculos) {
  const v = byId.get(e.id);
  check(v, `index.json: id ${e.id} não existe em vehicles.json`);
  if (v) { check(e.preco === v.preco && e.km === v.km && e.capa === v.capa && e.nFotos === v.fotos.length && e.video === !!v.video, `index.json: id ${e.id} divergente de vehicles.json`); }
}
for (const f of fs.readdirSync(path.join(ROOT, 'v'))) { const m = f.match(/^(\d+)\.html$/); if (m) check(ids.has(Number(m[1])), `v/${f} é de um veículo que não está mais no estoque (rode npm run pages)`); }
for (const key of Object.keys(cats.modelos)) check(Object.keys(cats.categorias).includes(cats.modelos[key]), `categorias.json: categoria desconhecida em ${key}`);
if (aval.nota !== null) { check(typeof aval.nota === 'number' && aval.nota > 0 && aval.nota <= 5, 'avaliacoes.json: nota fora de 0-5'); check(/^https:\/\//.test(aval.linkGoogle), 'avaliacoes.json: linkGoogle precisa ser https'); for (const r of aval.avaliacoes || []) check(r.nome && r.texto && r.estrelas >= 1 && r.estrelas <= 5, 'avaliacoes.json: avaliação incompleta'); }
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
check((sitemap.match(/<url>/g) || []).length === list.length + 6, 'sitemap.xml com contagem inesperada de URLs (rode npm run pages)');
const thumbs = fs.readdirSync(path.join(ROOT, 'assets/thumbs')).filter((f) => f.endsWith('.webp')).length;
if (thumbs < list.length) console.log(`aviso: ${list.length - thumbs} veículos sem miniatura local (o site usa a foto original)`);

if (erros.length) { console.error(`FALHOU: ${erros.length} problema(s)\n  ` + erros.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`OK: ${list.length} veículos, ${idx.veiculos.length} no índice, ${(veic.destaques || []).length} destaques, ${thumbs} miniaturas, ${Object.keys(cats.modelos).length} modelos categorizados.`);
