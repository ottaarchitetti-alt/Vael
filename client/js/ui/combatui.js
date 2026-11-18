// Interfaccia di battaglia: ordine dei turni, menu comandi stile JRPG, bersagli, ricompense
import { SKILLS, CLASSES, WEAPON_MOVES } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { MYTHIC } from '/shared/data/mythic.js';
import { ELEMENTS } from '/shared/rules.js';
import { heroPortrait, enemyPortrait } from '../render/rig.js';
import { esc } from './util.js';

export function validTargets(c, actor, sk) {
  if (!actor) return [];
  const foes = c.units.filter((u) => u.side !== actor.side && u.alive);
  const friends = c.units.filter((u) => u.side === actor.side);
  switch (sk.target) {
    case 'ally': return friends.filter((u) => u.alive).map((u) => u.id);
    case 'deadAlly': return friends.filter((u) => !u.alive).map((u) => u.id);
    case 'enemy': {
      const melee = sk.kind === 'phys' && !sk.reach && !actor.ranged;
      const front = foes.some((u) => u.row === 0);
      return foes.filter((u) => !(melee && u.row === 1 && front)).map((u) => u.id);
    }
    default: return null; // nessun bersaglio da scegliere
  }
}

export function renderCombat(app) {
  const s = app.state, c = s.combat;
  if (!c) return '';
  const unit = (id) => c.units.find((u) => u.id === id);
  const portrait = (u) => (u.side === 'hero' ? heroPortrait(s.heroes.find((h) => h.id === u.heroId), 1) : enemyPortrait(u.enemyId));
  // ordine dei turni
  const upcoming = c.order.slice(Math.max(0, c.turn)).map(unit).filter((u) => u && u.alive);
  const order = `<div class="turnbar"><span class="round">Turno ${c.round}</span>${upcoming.map((u, i) => `<div class="tb-unit ${u.side} ${i === 0 && c.phase === 'fight' ? 'now' : ''} ${u.broken > 0 ? 'broken' : ''}" title="${esc(u.name)}"><img src="${portrait(u)}" alt=""></div>`).join('')}</div>`;
  const bossLine = c.bossLine && app.ui.bossLineSeen !== c.bossLine ? `<div class="boss-line">${esc(c.bossLine)}</div>` : '';

  if (c.phase !== 'fight') {
    const r = c.rewards;
    const title = c.phase === 'victory' ? 'Vittoria!' : c.phase === 'fled' ? 'Fuga riuscita' : 'Sconfitta...';
    return `${order}<div class="combat-end ${c.phase}">
      <h2>${title}</h2>
      ${r ? `<div class="rewards"><span>+${r.xp} XP</span><span>+${r.gold} 🪙</span>${r.items.map((i) => `<span>🎁 ${esc(i)}</span>`).join('')}</div>${r.levels.length ? `<div class="levels">${r.levels.map((l) => `<span>✦ ${esc(l)}</span>`).join('')}</div>` : ''}` : ''}
      ${c.phase === 'defeat' ? `<p>${s.fate >= 2 ? 'Il Fato può ancora salvarvi (−2 Scintille).' : 'Non restano abbastanza Scintille del Fato...'}</p>` : ''}
      <button class="primary" data-act="combat_continue">Continua</button>
    </div>`;
  }
  const actor = unit(c.active);
  if (!actor) return order;
  if (actor.acted) return `${order}${bossLine}<div class="cmd waiting">...</div>`;
  if (actor.side === 'enemy') return `${order}${bossLine}<div class="cmd waiting"><b>${esc(actor.name)}</b> sta agendo...</div>`;
  const hero = s.heroes.find((h) => h.id === actor.heroId);
  if (!app.canControl(hero)) {
    const owner = app.players.find((p) => p.id === hero.owner);
    return `${order}${bossLine}<div class="cmd waiting">Turno di <b>${esc(hero.name)}</b> — <span style="color:${owner?.color}">${esc(owner?.name || '')}</span> sta decidendo...</div>`;
  }
  const ui = app.ui;
  const menu = ui.cmenu || 'main';
  const pend = ui.pending;
  let inner = '';
  if (pend) {
    const sk = pend.sk;
    const ids = validTargets(c, actor, sk);
    inner = `<div class="cmd-title">${esc(sk.name)} — scegli il bersaglio</div>
      <div class="targets">${ids.map((id) => { const u = unit(id); return `<button data-act="ctarget" data-id="${id}"><img src="${portrait(u)}" alt="">${esc(u.name)} <small>${u.hp}/${u.maxHp}</small></button>`; }).join('')}</div>
      <p class="small muted">Puoi anche cliccare direttamente sul bersaglio nella scena.</p>
      <button class="ghost" data-act="cback">◂ Indietro</button>`;
  } else if (menu === 'skills') {
    inner = `<div class="cmd-title">Abilità — PM ${actor.mp}/${actor.maxMp}${actor.statuses.silence ? ' <span class="bad">(Silenzio!)</span>' : ''}</div>
      <div class="skill-list">${actor.skills.map((id) => { const k = SKILLS[id]; const ok = actor.mp >= k.mp && !actor.statuses.silence; return `<button ${ok ? '' : 'disabled'} data-act="cskill" data-skill="${id}" title="${esc(k.desc || '')}"><b>${esc(k.name)}</b>${k.el ? ` <span style="color:${ELEMENTS[k.el].color}">${ELEMENTS[k.el].icon}</span>` : ''}<span class="mp">${k.mp} PM</span><small>${esc(k.desc || '')}</small></button>`; }).join('')}</div>
      <button class="ghost" data-act="cback">◂ Indietro</button>`;
  } else if (menu === 'items') {
    const usable = s.bag.filter((i) => ITEMS[i.base].use && !ITEMS[i.base].use.threat);
    inner = `<div class="cmd-title">Oggetti</div><div class="skill-list">${usable.length ? usable.map((i) => `<button data-act="citem" data-uid="${i.uid}"><b>${ITEMS[i.base].icon} ${esc(ITEMS[i.base].name)}</b><small>${esc(ITEMS[i.base].desc)}</small></button>`).join('') : '<p class="muted">Nessun oggetto utilizzabile.</p>'}</div>
      <button class="ghost" data-act="cback">◂ Indietro</button>`;
  } else {
    const av = c.avail || {};
    const partner = av.concert && unit(av.concert.partner);
    inner = `<div class="cmd-title"><img src="${heroPortrait(hero, 1)}" alt=""> ${esc(hero.name)} <small>${CLASSES[hero.cls].name}</small>${actor.charge ? ` <span class="chg">Slancio ${'◆'.repeat(actor.charge)}</span>` : ''}</div>
      <div class="cmd-grid">
        ${(WEAPON_MOVES[actor.wtype] || WEAPON_MOVES.spada).map((m) => `<button class="wmove" data-act="cweapon" data-move="${m.id}" title="${esc(m.desc)}">${m.icon} ${esc(m.name)}<small>${m.ranged ? '🏹 distanza' : '⚔ mischia'}${m.aoe === 'sweep' ? ' · ad arco' : m.aoe === 'row' ? ' · tutta la fila' : m.aoe === 'volley' ? ' · a raffica' : m.target === 'enemies' ? ' · tutti' : ''}</small></button>`).join('')}
        <button data-act="cmenu" data-m="skills">✦ Abilità<small>${actor.mp} PM</small></button>
        <button data-act="cdo" data-kind="charge" ${actor.charge >= 3 ? 'disabled' : ''}>◆ Slancio<small>${actor.charge}/3 · prossimo colpo ×${[1, 1.5, 2, 2.5][Math.min(3, actor.charge + 1)]}</small></button>
        <button data-act="cdo" data-kind="defend">🛡 Difendi<small>−50% danni, +PM</small></button>
        <button data-act="cmenu" data-m="items">🎒 Oggetti</button>
        <button data-act="cdo" data-kind="move">${actor.row ? '⇠ Avanza' : '⇢ Arretra'}<small>${actor.row ? 'in prima fila' : 'in seconda fila'}</small></button>
        ${partner ? `<button class="concert" data-act="cdo" data-kind="concert">♫ Concerto<small>con ${esc(partner.name)}</small></button>` : ''}
        ${av.summon ? `<button class="summon" data-act="cdo" data-kind="summon" style="--mc:${MYTHIC[s.mythic].color}">${MYTHIC[s.mythic].icon} ${esc(SKILLS[av.summon].name.replace('Evocazione: ', ''))}<small>1 Scintilla</small></button>` : ''}
        ${c.boss ? '' : '<button class="ghost" data-act="cdo" data-kind="flee">🏃 Fuga</button>'}
      </div>`;
  }
  return `${order}${bossLine}<div class="cmd">${inner}</div>`;
}
