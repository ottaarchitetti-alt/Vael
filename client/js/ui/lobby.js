// Lobby: invito, giocatori, creazione eroi, avvio/caricamento
import { CLASSES, SKILLS } from '/shared/data/classes.js';
import { TRAITS, LOOK, HERO_NAMES } from '/shared/data/heroes.js';
import { LORE } from '/shared/data/mythic.js';
import { heroDerived, STAT_ABBR, STATS, MAX_HEROES } from '/shared/rules.js';
import { heroFull, heroPortrait } from '../render/pixel.js';
import { esc, nl2p } from './util.js';

export function renderLobby(app) {
  const { state, players, me, ui } = app;
  const d = ui.draft ||= { name: HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)], cls: 'lama', skin: LOOK.skin[0], hair: LOOK.hair[1] };
  const preview = { cls: d.cls, look: { skin: d.skin, hair: d.hair }, transforms: [], equip: {}, level: 1, talents: [], traits: [], bonusStats: {} };
  const cls = CLASSES[d.cls];
  const der = heroDerived(preview, null);
  const inv = app.invite || {};
  const isHost = me?.isHost;
  const full = state.heroes.length >= MAX_HEROES;
  const myHeroes = state.heroes.filter((h) => h.owner === me?.playerId).length;

  const invite = `
    <div class="panel invite">
      <h3>Invita i compagni</h3>
      <div class="code">Codice stanza <b>${esc(app.code || inv.code || '----')}</b></div>
      ${inv.publicUrl ? `<div class="link"><span class="tag ok">Internet</span><input readonly value="${esc(inv.publicUrl)}/?code=${esc(inv.code)}"><button data-act="copy" data-text="${esc(inv.publicUrl)}/?code=${esc(inv.code)}">Copia</button></div>${inv.tunnelInfo ? `<small class="muted">${esc(inv.tunnelInfo)}</small>` : ''}`
        : inv.tunnelState === 'starting' ? '<div class="muted">Apertura del tunnel Internet in corso...</div>'
          : `<div class="muted small">Per giocare via Internet avvia l'host con <code>npm run host</code> (o <code>avvia-online.bat</code>).${inv.tunnelState === 'error' ? `<br><span class="bad">Tunnel non riuscito: ${esc(inv.tunnelInfo)}</span>` : ''}</div>`}
      ${(inv.lan || []).map((u) => `<div class="link"><span class="tag">LAN</span><input readonly value="${esc(u)}/?code=${esc(inv.code)}"><button data-act="copy" data-text="${esc(u)}/?code=${esc(inv.code)}">Copia</button></div>`).join('')}
    </div>`;

  const plist = `
    <div class="panel players">
      <h3>Compagnia (${players.filter((p) => p.connected).length})</h3>
      ${players.map((p) => `<div class="pl ${p.connected ? '' : 'off'}"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}${p.isHost ? ' <span class="tag">host</span>' : ''}${p.id === me?.playerId ? ' <span class="tag you">tu</span>' : ''}</div>`).join('')}
    </div>`;

  const classCards = Object.values(CLASSES).map((c) => `
    <button class="cls-card ${c.id === d.cls ? 'sel' : ''}" data-act="draft" data-k="cls" data-v="${c.id}" style="--cc:${c.look.cloak}">
      <img src="${heroPortrait({ cls: c.id, look: { skin: d.skin, hair: d.hair }, transforms: [], equip: {} }, 2)}" alt="">
      <b>${c.icon} ${c.name}</b><small>${c.role}</small>
    </button>`).join('');

  const swatches = (k, arr) => arr.map((col) => `<button class="sw ${d[k] === col ? 'sel' : ''}" style="background:${col}" data-act="draft" data-k="${k}" data-v="${col}"></button>`).join('');

  const creator = `
    <div class="panel creator">
      <h3>Forgia un Viandante</h3>
      <div class="cls-grid">${classCards}</div>
      <div class="creator-body">
        <div class="preview"><img src="${heroFull(preview, 4)}" alt=""></div>
        <div class="cinfo">
          <label>Nome <input id="heroName" maxlength="18" value="${esc(d.name)}" data-draft="name"></label>
          <div class="sw-row"><span>Pelle</span>${swatches('skin', LOOK.skin)}</div>
          <div class="sw-row"><span>Capelli</span>${swatches('hair', LOOK.hair)}</div>
          <p class="cdesc">${esc(cls.desc)}</p>
          <div class="statline">${STATS.map((s) => `<span><small>${STAT_ABBR[s]}</small>${der.stats[s]}</span>`).join('')}<span><small>PV</small>${der.maxHp}</span><span><small>PM</small>${der.maxMp}</span></div>
          <div class="skills-mini">${cls.skills.map(([id, l]) => `<span title="${esc(SKILLS[id].desc)}">${esc(SKILLS[id].name)} <small>Lv${l}</small></span>`).join('')}</div>
          <div class="subs">${cls.subclasses.map((s) => `<div><b>${esc(s.name)}</b> <small>(Lv3)</small> — ${esc(s.desc)}</div>`).join('')}</div>
          <button class="primary" data-act="create_hero" ${full ? 'disabled' : ''}>${full ? 'Gruppo al completo' : 'Crea eroe'}</button>
          ${ui.legends?.length ? `<details class="legends"><summary>Richiama una Leggenda (${ui.legends.length})</summary>${ui.legends.map((l) => `<div class="leg"><b>${esc(l.name)}</b> ${esc(CLASSES[l.cls]?.name)} — <i>${esc(l.title || '')}</i> <button data-act="legend" data-id="${esc(l.id)}" ${full ? 'disabled' : ''}>Richiama</button></div>`).join('')}</details>` : ''}
        </div>
      </div>
    </div>`;

  const party = `
    <div class="panel partylist">
      <h3>Il Gruppo (${state.heroes.length}/${MAX_HEROES})</h3>
      ${state.heroes.length ? '' : '<p class="muted">Nessun eroe. Ogni giocatore crea il proprio (con meno di 4 giocatori potete crearne più di uno a testa).</p>'}
      ${state.heroes.map((h) => {
        const owner = players.find((p) => p.id === h.owner);
        const mine = h.owner === me?.playerId;
        return `<div class="ph">
          <img src="${heroPortrait(h, 2)}" alt="">
          <div><b>${esc(h.name)}</b>${h.legend ? ' <span class="tag gold">Leggenda</span>' : ''}<br><small>${CLASSES[h.cls].name} · ${h.age} anni · <span style="color:${owner?.color || '#aaa'}">${esc(owner?.name || h.ownerName)}</span></small>
          <div class="traits">${h.traits.map((t) => `<span class="trait" title="${esc(TRAITS[t].desc)}">${esc(TRAITS[t].name)}</span>`).join('')}</div></div>
          <div class="ph-btns">
            ${mine && !h.legend ? '<button data-act="reroll_traits" data-hero="' + h.id + '" title="Rigenera tratti">🎲</button>' : ''}
            ${isHost ? `<select data-act-change="assign_hero" data-hero="${h.id}">${players.map((p) => `<option value="${p.id}" ${p.id === h.owner ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
            ${mine || isHost ? `<button data-act="delete_hero" data-hero="${h.id}" title="Rimuovi">✕</button>` : ''}
          </div>
        </div>`;
      }).join('')}
      ${isHost ? `
        <div class="host-ctrl">
          <button class="primary big" data-act="start" ${state.heroes.length ? '' : 'disabled'}>⚔ Inizia la campagna</button>
          <button data-act="show_saves">📂 Carica partita</button>
          ${ui.saves ? `<div class="saves">${ui.saves.length ? ui.saves.map((s) => `<div class="save"><div><b>${esc(s.name)}</b><br><small>Atto ${s.act} · giorno ${s.day} · ${new Date(s.date).toLocaleString('it-IT')}</small><br><small class="muted">${esc(s.heroes)}</small></div><button data-act="load" data-file="${esc(s.file)}">Carica</button></div>`).join('') : '<p class="muted">Nessun salvataggio.</p>'}</div>` : ''}
        </div>` : `<p class="muted">In attesa che l'host avvii la campagna${myHeroes ? '' : ' — crea il tuo eroe!'}</p>`}
    </div>`;

  return `
    <div class="lobby">
      <div class="lobby-head">
        <h1>Ceneri di Vael</h1>
        <div class="subtitle">Un gioco di ruolo cooperativo nel crepuscolo eterno</div>
      </div>
      <div class="lobby-grid">
        <div class="col">${invite}${plist}<div class="panel lore"><h3>Il Mondo</h3><div class="lore-text">${nl2p(LORE)}</div></div></div>
        <div class="col wide">${creator}</div>
        <div class="col">${party}</div>
      </div>
    </div>`;
}
