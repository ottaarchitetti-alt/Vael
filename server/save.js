// Salvataggi su disco (cartella saves/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'saves');
fs.mkdirSync(DIR, { recursive: true });

const safe = (n) => String(n || 'partita').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'partita';

export function writeSave(name, state, meta) {
  const file = `${safe(name)}.json`;
  fs.writeFileSync(path.join(DIR, file), JSON.stringify({ meta: { ...meta, name, date: new Date().toISOString() }, state }));
  return file;
}

export function listSaves() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'legends.json' && f !== 'abisso.json').map((f) => {
    try {
      const { meta } = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      return { file: f, ...meta };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function readSave(file) {
  const p = path.join(DIR, path.basename(file));
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function readLegends() {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'legends.json'), 'utf8')); } catch { return []; }
}
export function addLegends(list) {
  const all = readLegends();
  for (const l of list) if (!all.find((x) => x.id === l.id)) all.push(l);
  fs.writeFileSync(path.join(DIR, 'legends.json'), JSON.stringify(all.slice(-40)));
}

// record dell'Abisso Senza Fondo (piano più profondo raggiunto)
export function readAbyssRecords() {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, 'abisso.json'), 'utf8')); } catch { return []; }
}
export function addAbyssRecord(rec) {
  const all = readAbyssRecords();
  all.push(rec);
  all.sort((a, b) => b.floor - a.floor);
  fs.writeFileSync(path.join(DIR, 'abisso.json'), JSON.stringify(all.slice(0, 20)));
}
