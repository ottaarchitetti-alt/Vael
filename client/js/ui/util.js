// Utilità UI
import { ITEMS, RARITY } from '/shared/data/items.js';
import { itemBonuses, STAT_ABBR } from '/shared/rules.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nl2p = (s) => esc(s).split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('');

export function toast(text, kind = 'info') {
  const box = document.getElementById('toasts');
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = text;
  box.appendChild(d);
  setTimeout(() => d.classList.add('out'), 3200);
  setTimeout(() => d.remove(), 3800);
}

export function bar(cur, max, cls) {
  const pct = max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  return `<div class="bar ${cls}"><div class="fill" style="width:${pct}%"></div><span>${Math.max(0, Math.round(cur))}/${max}</span></div>`;
}

const BONUS_NAMES = { atk: 'Att', mag: 'Mag', def: 'Dif', mdef: 'DifM', hp: 'PV', mp: 'PM', crit: 'Crit%', eva: 'Schiv%', spd: 'Vel', hpPct: 'PV%', defPct: 'Dif%', dmgPct: 'Danni%', healPct: 'Cure%' };
export function bonusText(b) {
  return Object.entries(b || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_ABBR[k] || BONUS_NAMES[k] || k}`).join(', ');
}
export function itemHtml(it, extra = '') {
  const d = ITEMS[it.base];
  const r = RARITY[it.rarity || 'comune'];
  const desc = d.use ? d.desc : bonusText(itemBonuses(it)) + (d.el ? ` · elemento ${d.el}` : '');
  return `<div class="item" style="--rc:${r.color}" title="${esc(desc)}"><span class="ii">${d.icon || '◆'}</span><span class="in"><b>${esc(it.name || d.name)}</b><small>${esc(desc)}</small></span>${extra}</div>`;
}
