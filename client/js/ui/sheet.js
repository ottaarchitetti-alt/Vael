// Scheda personaggio e inventario condiviso
import { CLASSES, SKILLS } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { TALENTS, TRAITS, TRANSFORMS, BONDS } from '/shared/data/heroes.js';
import { heroDerived, heroSkills, STATS, STAT_NAMES, STAT_ABBR, SLOTS, SLOT_NAMES, xpToNext, ELEMENTS, mod, checkBonus } from '/shared/rules.js';
import { heroFull, heroPortrait } from '../render/pixel.js';
import { esc, bar, itemHtml, bonusText } from './util.js';

export function renderSheet(app) {
  const s = app.state;
  const h = s.heroes.find((x) => x.id === app.ui.sheetHero) || s.heroes[0];
  if (!h) return '';
  const cls = CLASSES[h.cls];
  const d = heroDerived(h, s);
  const can = app.canControl(h);
  const tab = app.ui.sheetTab || 'info';
  const pend = (h.pendingTalents?.length || 0) + (h.pendingSub ? 1 : 0) + (s.crystals && !h.job ? 1 : 0);
  const sub = cls.subclasses.find((x) => x.id === h.sub);
  const inCombat = s.phase === 'combat';
  let body = '';
  if (tab === 'info') {
    body = `<div class="sheet-info">
      <div class="statgrid">${STATS.map((k) => `<div class="st" title="${STAT_NAMES[k]} — prove: ${checkBonus(h, k, s) >= 0 ? '+' : ''}${checkBonus(h, k, s)}"><small>${STAT_ABBR[k]}</small><b>${d.stats[k]}</b><i>${mod(d.stats[k]) >= 0 ? '+' : ''}${mod(d.stats[k])}</i></div>`).join('')}</div>
      <div class="derived">
        <span>Attacco <b>${d.atk}</b></span><span>Magia <b>${d.mag}</b></span><span>Cura <b>${d.heal}</b></span><span>Difesa <b>${d.def}</b></span><span>Dif. magica <b>${d.mdef}</b></span>
        <span>Velocità <b>${d.spd}</b></span><span>Critico <b>${d.crit}%</b></span><span>Schivata <b>${d.eva}%</b></span><span>Elemento <b>${ELEMENTS[d.element]?.icon} ${ELEMENTS[d.element]?.name}</b></span><span>Portata <b>${d.ranged ? 'Distanza' : 'Mischia'}</b></span>
      </div>
      <h4>Tratti</h4><div class="traits">${h.traits.map((t) => `<span class="trait" title="${esc(TRAITS[t].desc)}">${esc(TRAITS[t].name)}</span>`).join('')}</div>
      <p class="small muted">${h.traits.map((t) => esc(TRAITS[t].desc)).join(' ')}</p>
      ${h.transforms.length ? `<h4>Trasformazioni e cicatrici</h4>${h.transforms.map((t) => `<div class="tf"><b>${esc(TRANSFORMS[t].name)}</b> — ${esc(TRANSFORMS[t].desc)}</div>`).join('')}` : ''}
      <h4>Legami</h4>${Object.keys(h.bonds || {}).length ? Object.entries(h.bonds).map(([id, type]) => { const o = s.heroes.find((x) => x.id === id); return o ? `<div class="bond">${BONDS[type].icon} <b>${esc(o.name)}</b> — ${BONDS[type].name}: <small>${esc(BONDS[type].desc)}</small></div>` : ''; }).join('') : '<p class="muted small">Nessun legame. Gli accampamenti avvicinano (o dividono) i compagni.</p>'}
      <h4>Formazione</h4><div class="btnrow left"><button class="${(h.row ?? cls.row) === 0 ? 'sel' : ''}" ${can && !inCombat ? '' : 'disabled'} data-act="set_row" data-hero="${h.id}" data-row="0">Fila avanti</button><button class="${(h.row ?? cls.row) === 1 ? 'sel' : ''}" ${can && !inCombat ? '' : 'disabled'} data-act="set_row" data-hero="${h.id}" data-row="1">Fila dietro</button></div>
    </div>`;
  } else if (tab === 'equip') {
    body = `<div class="equip">
      <div class="slots">${SLOTS.map((sl) => `<div class="slot"><small>${SLOT_NAMES[sl]}</small>${h.equip[sl] ? itemHtml(h.equip[sl], can && !inCombat ? `<button data-act="unequip" data-hero="${h.id}" data-slot="${sl}">Togli</button>` : '') : '<div class="empty">— vuoto —</div>'}</div>`).join('')}</div>
      <div class="bag"><h4>Zaino del gruppo (${s.bag.length})</h4>${s.bag.length ? s.bag.map((it) => {
        const def = ITEMS[it.base];
        let btn = '';
        if (can && !inCombat) {
          if (def.slot === 'use') btn = def.use?.bomb ? '' : `<button data-act="use_item" data-hero="${h.id}" data-uid="${it.uid}">Usa</button>`;
          else btn = `<button data-act="equip" data-hero="${h.id}" data-uid="${it.uid}">Equipaggia</button>`;
        }
        if (!inCombat) btn += `<button class="ghost" data-act="discard" data-uid="${it.uid}" title="Getta">🗑</button>`;
        return itemHtml(it, btn);
      }).join('') : '<p class="muted">Vuoto.</p>'}</div>
    </div>`;
  } else if (tab === 'skills') {
    const sk = heroSkills(h);
    body = `<div class="skills">${['attacco', ...sk].map((id) => { const k = SKILLS[id]; return `<div class="skill"><b>${esc(k.name)}</b> <span class="mp">${k.mp ? k.mp + ' PM' : '—'}</span>${k.el ? ` <span style="color:${ELEMENTS[k.el].color}">${ELEMENTS[k.el].icon}</span>` : ''}<br><small>${esc(k.desc || '')}</small></div>`; }).join('')}</div>
      <h4>Prossime abilità</h4><div class="skills future">${cls.skills.filter(([, l]) => l > h.level).map(([id, l]) => `<div class="skill"><b>${esc(SKILLS[id].name)}</b> <small>Lv${l}</small><br><small>${esc(SKILLS[id].desc)}</small></div>`).join('') || '<p class="muted">Tutte apprese.</p>'}</div>`;
  } else if (tab === 'grow') {
    const opts = h.pendingTalents?.[0];
    body = `<div class="grow">
      ${h.pendingSub ? `<div class="choice"><h4>Scegli la sottoclasse</h4><div class="cards">${cls.subclasses.map((x) => `<button class="card" ${can ? '' : 'disabled'} data-act="choose_sub" data-hero="${h.id}" data-sub="${x.id}"><b>${esc(x.name)}</b><p>${esc(x.desc)}</p><small>${bonusText(x.bonus)}</small><small>Abilità: ${x.skills.map(([id, l]) => `${SKILLS[id].name} (Lv${l})`).join(', ')}</small></button>`).join('')}</div></div>` : ''}
      ${opts ? `<div class="choice"><h4>Scegli un talento (livello ${h.level - h.pendingTalents.length + 1})</h4><div class="cards">${opts.map((t) => `<button class="card" ${can ? '' : 'disabled'} data-act="choose_talent" data-hero="${h.id}" data-talent="${t}"><b>${esc(TALENTS[t].name)}</b><p>${esc(TALENTS[t].desc)}</p></button>`).join('')}</div></div>` : ''}
      ${s.crystals ? `<div class="choice"><h4>Mestiere secondario ${h.job ? `— attuale: ${CLASSES[h.job].name}` : ''}</h4><p class="small muted">Apprendi le prime due abilità di un'altra classe.</p><div class="cards small">${Object.values(CLASSES).filter((c) => c.id !== h.cls).map((c) => `<button class="card ${h.job === c.id ? 'sel' : ''}" ${can && !inCombat ? '' : 'disabled'} data-act="choose_job" data-hero="${h.id}" data-job="${c.id}"><b>${c.icon} ${c.name}</b><small>${c.skills.slice(0, 2).map(([id]) => SKILLS[id].name).join(', ')}</small></button>`).join('')}</div></div>` : ''}
      <h4>Talenti appresi</h4>${h.talents.length ? h.talents.map((t) => `<div class="tf"><b>${esc(TALENTS[t].name)}</b> — ${esc(TALENTS[t].desc)}</div>`).join('') : '<p class="muted small">Nessuno.</p>'}
    </div>`;
  }
  return `<div class="modal-box sheet">
    <button class="close" data-act="close_modal">✕</button>
    <div class="sheet-tabs">${s.heroes.map((x) => `<button class="${x.id === h.id ? 'sel' : ''}" data-act="sheet" data-hero="${x.id}"><img src="${heroPortrait(x, 1)}" alt="">${esc(x.name)}</button>`).join('')}</div>
    <div class="sheet-main">
      <div class="sheet-left">
        <div class="big-sprite"><img src="${heroFull(h, 4)}" alt=""></div>
        <h2>${esc(h.name)}</h2>
        <div class="cls-line">${cls.icon} ${cls.name}${sub ? ` · ${esc(sub.name)}` : ''}${h.job ? ` / ${CLASSES[h.job].name}` : ''}</div>
        <div class="small muted">${h.age} anni${h.legend ? ' · Leggenda' : ''} · ${can ? 'controllato da te' : 'controllato da ' + esc(app.players.find((p) => p.id === h.owner)?.name || '?')}</div>
        <div class="lvl">Livello ${h.level}</div>
        ${bar(h.xp, xpToNext(h.level), 'xp')}
        ${bar(h.hp, d.maxHp, 'hp')}${bar(h.mp, d.maxMp, 'mp')}
      </div>
      <div class="sheet-right">
        <div class="tabs">${[['info', 'Scheda'], ['equip', 'Equipaggiamento'], ['skills', 'Abilità'], ['grow', `Crescita${pend ? ` <span class="lvup">▲${pend}</span>` : ''}`]].map(([k, n]) => `<button class="${tab === k ? 'sel' : ''}" data-act="sheet_tab" data-tab="${k}">${n}</button>`).join('')}</div>
        <div class="sheet-body">${body}</div>
      </div>
    </div>
  </div>`;
}
