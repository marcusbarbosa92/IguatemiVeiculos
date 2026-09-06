#!/usr/bin/env node
/* Testa o parser do sync (a parte mais frágil: regex sobre HTML da AutoCerto) contra páginas reais salvas em tests/fixtures.
   node tests/parser.test.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests/fixtures');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'iguatemi-sync-'));
execFileSync('node', [path.join(ROOT, 'scripts/sync-inventory.mjs'), '--from-dir', path.join(FIX, 'autocerto'), '--date', '2026-09-06', '--out', out], { stdio: ['ignore', 'ignore', 'inherit'] });
const got = JSON.parse(fs.readFileSync(path.join(out, 'vehicles.json'), 'utf8'));
const gotIdx = JSON.parse(fs.readFileSync(path.join(out, 'index.json'), 'utf8'));
const esperado = JSON.parse(fs.readFileSync(path.join(FIX, 'esperado-vehicles.json'), 'utf8'));
const esperadoIdx = JSON.parse(fs.readFileSync(path.join(FIX, 'esperado-index.json'), 'utf8'));
const falhas = [];
if (!isDeepStrictEqual(got, esperado)) {
  falhas.push('vehicles.json diferente do esperado');
  for (const v of esperado.veiculos) { const g = got.veiculos.find((x) => x.id === v.id); if (!g) { falhas.push(`  veículo ${v.id} ausente`); continue; } for (const k of Object.keys(v)) if (!isDeepStrictEqual(g[k], v[k])) falhas.push(`  ${v.id}.${k}: esperado ${JSON.stringify(v[k]).slice(0, 80)} obtido ${JSON.stringify(g[k]).slice(0, 80)}`); }
}
if (!isDeepStrictEqual(gotIdx, esperadoIdx)) falhas.push('index.json diferente do esperado');
// invariantes que valem para qualquer fixture
for (const v of got.veiculos) {
  if (!(v.preco > 0 && v.fotos.length > 0 && v.anoModelo >= v.anoFabricacao && v.km >= 0)) falhas.push(`invariante quebrada em ${v.id}`);
}
fs.rmSync(out, { recursive: true, force: true });
if (falhas.length) { console.error('FALHOU:\n' + falhas.join('\n')); process.exit(1); }
console.log(`OK: parser reproduziu ${got.veiculos.length} veículos das páginas em tests/fixtures (destaques: ${got.destaques.join(', ') || 'nenhum'}).`);
