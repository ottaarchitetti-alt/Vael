// Pannelli narrativi: eventi, città, accampamenti, capitoli, sentieri mitici, finali
import { CLASSES } from '/shared/data/classes.js';
import { ITEMS } from '/shared/data/items.js';
import { MYTHIC } from '/shared/data/mythic.js';
import { TOWN_SERVICES } from '/shared/data/story.js';
import { checkBonus, successChance, STAT_NAMES, heroDerived, itemPrice, SLOTS, SLOT_NAMES } from '/shared/rules.js';
import { eventArt, heroPortrait } from '../render/pixel.js';
import { esc, nl2p, itemHtml } from './util.js';

function voteBar(app, idx) {
  const v = app.state.vote;
  if (!v) return '';
  const voters = Object.entries(v.votes).filter(([, i]) => i === idx).map(([pid]) => app.players.find((p) => p.id === pid)).filter(Boolean);
  return `<span class="voters">${voters.map((p) => `<i style="background:${p.color}" title="${esc(p.name)}"></i>`).join('')}</span>`;
}
function voteFooter(app) {
  const v = app.state.vote;
  if (!v) return '';
  const conn = app.players.filter((p) => p.connected);
  const n = Object.keys(v.votes).length;
  return `<div class="vote-foot"><span>Voti: ${n}/${conn.length}${conn.length > 1 ? ' — si decide a maggioranza, l\'host spareggia' : ''}</span>${app.me?.isHost && conn.length > 1 ? '<button data-act="force_vote">Decidi ora</button>' : ''}</div>`;
}

export function renderEvent(app) {
  const s = app.state, e = s.event;
  if (!e) return '';
  const myVote = s.vote?.votes?.[app.me?.playerId];
  let body = '';
  if (e.stage === 'choose') {
    body = `<div class="opts">${e.opts.map((o, i) => {
      let chk = '';
      if (o.check) {
        const best = Math.max(...s.heroes.filter((h) => h.alive).map((h) => successChance(checkBonus(h, o.check.stat, s), o.check.dc)));
        chk = `<span class="chk">Prova di ${STAT_NAMES[o.check.stat]} · CD ${o.check.dc} · fino al ${Math.round(best * 100)}%</span>`;
      }
      return `<button class="opt ${myVote === i ? 'voted' : ''}" ${o.locked ? 'disabled' : ''} data-act="vote" data-idx="${i}">
        <span class="ot">${esc(o.text)}</span>${chk}${o.locked ? `<span class="lock">🔒 ${esc(o.locked)}</span>` : ''}${voteBar(app, i)}</button>`;
    }).join('')}</div>${voteFooter(app)}`;
  } else if (e.stage === 'roll') {
    const opt = e.opts[e.chosen];
    body = `<div class="chosen">«${esc(opt.text)}»</div>
      <div class="check-head">Prova di <b>${STAT_NAMES[e.check.stat]}</b> — Classe Difficoltà <b>${e.check.dc}</b></div>
      <p class="muted">Chi tenta la prova? Ogni giocatore può tirare con i propri eroi.</p>
      <div class="rollers">${s.heroes.filter((h) => h.alive).map((h) => {
        const b = checkBonus(h, e.check.stat, s);
        const ch = successChance(b, e.check.dc);
        const can = app.canControl(h);
        const owner = app.players.find((p) => p.id === h.owner);
        return `<button class="roller" ${can ? '' : 'disabled'} data-act="roll_check" data-hero="${h.id}">
          <img src="${heroPortrait(h, 2)}" alt=""><b>${esc(h.name)}</b><span>${b >= 0 ? '+' : ''}${b}</span><span class="pct" style="--p:${ch * 100}%">${Math.round(ch * 100)}%</span>
          <small>${can ? '🎲 Tira' : esc(owner?.name || '')}</small></button>`;
      }).join('')}</div>`;
  } else if (e.stage === 'rolled') {
    const r = e.roll;
    const shown = app.ui.rollShown === r.id;
    body = `<div class="chosen">«${esc(e.opts[e.chosen].text)}»</div>
      <div class="rolled ${shown ? '' : 'wait'}">
        ${shown ? `<div class="roll-sum ${r.success ? 'ok' : 'ko'}">${esc(r.name)}: ${r.nat} ${r.bonus >= 0 ? '+' : '−'} ${Math.abs(r.bonus)} = <b>${r.total}</b> contro CD ${r.dc} — <b>${r.success ? 'SUCCESSO' : 'FALLIMENTO'}</b>${r.rerolls ? ` <small>(ritirato ×${r.rerolls})</small>` : ''}</div>
        <div class="btnrow">${!r.success ? `<button class="fate-btn" ${s.fate > 0 ? '' : 'disabled'} data-act="reroll">✨ Ritira (1 Scintilla del Fato · ${s.fate} rimaste)</button>` : ''}<button class="primary" data-act="accept_roll">${r.success ? 'Continua' : 'Accetta il destino'}</button></div>` : '<div class="muted">Il dado rotola...</div>'}
      </div>`;
  } else if (e.stage === 'result') {
    const r = e.result;
    body = `<div class="result ${r.success === true ? 'ok' : r.success === false ? 'ko' : ''}">${nl2p(r.text)}</div>
      ${r.gains?.length ? `<ul class="gains">${r.gains.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
      <div class="btnrow"><button class="primary" data-act="event_continue">Continua</button></div>`;
  }
  return `<div class="modal-box event ${e.story ? 'story' : ''}">
    <div class="ev-art" style="background-image:url(${eventArt(e.art)})"><h2>${esc(e.title)}</h2>${e.story ? '<span class="story-tag">★ Storia</span>' : ''}</div>
    <div class="ev-text">${nl2p(e.text)}</div>
    ${body}
  </div>`;
}

export function renderTown(app) {
  const s = app.state, t = s.town;
  if (!t) return '';
  const tab = app.ui.townTab || (t.services.includes('locanda') ? 'servizi' : 'bottega');
  const stock = t.tile ? s.map.tiles[t.tile]?.poi?.stock || [] : t.stock || [];
  const act = s.act;
  let body = '';
  if (tab === 'servizi') {
    const dead = s.heroes.filter((h) => !h.alive);
    body = `<div class="services">
      ${t.services.includes('locanda') ? `<div class="svc"><b>${TOWN_SERVICES.locanda.icon} Locanda</b><p>${TOWN_SERVICES.locanda.desc}</p><button data-act="town" data-svc="locanda">Riposa (${8 * act} oro)</button></div>` : ''}
      ${t.services.includes('cappella') ? `<div class="svc"><b>${TOWN_SERVICES.cappella.icon} Cappella</b><p>${TOWN_SERVICES.cappella.desc}</p>${dead.length ? dead.map((h) => `<button data-act="town" data-svc="cappella" data-hero="${h.id}">Rianima ${esc(h.name)} (${25 * act} oro)</button>`).join('') : '<small class="muted">Nessuno da rianimare.</small>'}</div>` : ''}
      ${t.services.includes('voci') ? `<div class="svc"><b>${TOWN_SERVICES.voci.icon} Taverna</b><p>${TOWN_SERVICES.voci.desc}</p><button data-act="town" data-svc="voci" ${t.rumors ? 'disabled' : ''}>Ascolta le voci (5 oro)</button><button data-act="town" data-svc="razioni">4 razioni (10 oro)</button></div>` : ''}
      ${t.services.includes('fabbro') ? `<div class="svc wide"><b>${TOWN_SERVICES.fabbro.icon} Fabbro</b><p>${TOWN_SERVICES.fabbro.desc} Ogni miglioria aggiunge un affisso e alza la rarità.</p>
        ${s.heroes.filter((h) => app.canControl(h)).map((h) => `<div class="smith"><b>${esc(h.name)}</b>${SLOTS.filter((sl) => h.equip[sl]).map((sl) => { const it = h.equip[sl]; const cost = 30 * act * (it.affixes.length + 1); return `<button data-act="town" data-svc="fabbro" data-hero="${h.id}" data-slot="${sl}" ${it.affixes.length >= 3 ? 'disabled' : ''} title="${esc(it.name)}">${SLOT_NAMES[sl]}: ${esc(it.name)} (${it.affixes.length >= 3 ? 'max' : cost + ' oro'})</button>`; }).join('')}</div>`).join('')}</div>` : ''}
    </div>`;
  } else {
    body = `<div class="shop">
      <div><h4>In vendita</h4>${stock.length ? stock.map((it) => itemHtml(it, `<button class="buy" data-act="buy" data-uid="${it.uid}" ${s.gold >= itemPrice(it) ? '' : 'disabled'}>🪙 ${itemPrice(it)}</button>`)).join('') : '<p class="muted">Scaffali vuoti.</p>'}</div>
      <div><h4>Il vostro zaino</h4>${s.bag.length ? s.bag.map((it) => itemHtml(it, `<button class="sell" data-act="sell" data-uid="${it.uid}">Vendi ${Math.max(1, Math.round(itemPrice(it) * 0.4))}</button>`)).join('') : '<p class="muted">Zaino vuoto.</p>'}</div>
    </div>`;
  }
  return `<div class="modal-box town">
    <div class="ev-art" style="background-image:url(${eventArt(t.services.length > 2 ? 'town' : 'merchant')})"><h2>${esc(t.name)}</h2></div>
    <div class="tabs">${t.services.length > 1 && t.services.includes('locanda') ? `<button class="${tab === 'servizi' ? 'sel' : ''}" data-act="town_tab" data-tab="servizi">Servizi</button>` : ''}<button class="${tab === 'bottega' ? 'sel' : ''}" data-act="town_tab" data-tab="bottega">Bottega</button>
    ${!t.services.includes('locanda') && t.services.includes('voci') ? `<button data-act="town" data-svc="voci" ${t.rumors ? 'disabled' : ''}>🍺 Voci (5)</button><button data-act="town" data-svc="razioni">🍖 Razioni (10)</button>` : ''}<span class="gold">🪙 ${s.gold}</span></div>
    ${body}
    <div class="btnrow"><button class="primary" data-act="leave_town">Riparti</button></div>
  </div>`;
}

export function renderCamp(app) {
  const s = app.state, c = s.camp;
  if (!c) return '';
  const sc = c.scene;
  const heroes = [sc?.a, sc?.b].filter(Boolean).map((id) => s.heroes.find((h) => h.id === id));
  const myVote = s.vote?.votes?.[app.me?.playerId];
  return `<div class="modal-box camp">
    <div class="ev-art" style="background-image:url(${eventArt('camp')})"><h2>Accampamento</h2></div>
    <div class="camp-heroes">${heroes.map((h) => `<img src="${heroPortrait(h, 3)}" alt="${esc(h.name)}">`).join('<span class="amp">&</span>')}</div>
    ${sc ? `<div class="ev-text">${nl2p(sc.text)}</div>` : ''}
    ${!c.result && sc ? `<div class="opts">${sc.opts.map((o, i) => `<button class="opt ${myVote === i ? 'voted' : ''}" data-act="vote" data-idx="${i}"><span class="ot">${esc(o)}</span>${sc.hints[i] ? `<span class="chk">${esc(sc.hints[i])}</span>` : ''}${voteBar(app, i)}</button>`).join('')}</div>${voteFooter(app)}` : ''}
    ${c.result ? `<div class="result ok">${esc(c.result.text)}</div><div class="btnrow"><button class="primary" data-act="camp_continue">Riprendi il viaggio</button></div>` : ''}
  </div>`;
}

export function renderChapter(app) {
  const c = app.state.chapter;
  return `<div class="modal-box chapter">
    <h1>${esc(c.title)}</h1>
    <div class="ev-text">${nl2p(c.text)}</div>
    ${c.chronicle.length ? `<h4>Cronaca dell'atto</h4><ol class="chron">${c.chronicle.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
    <h4>Gli anni passano</h4><ul class="gains">${c.gains.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
    <p class="muted">Un Cristallo si è risvegliato: ogni eroe può apprendere un mestiere secondario dalla propria scheda.</p>
    <div class="btnrow"><button class="primary" data-act="chapter_continue">Continua la storia</button></div>
  </div>`;
}

export function renderMythic(app) {
  const s = app.state;
  const myVote = s.vote?.votes?.[app.me?.playerId];
  return `<div class="modal-box mythic">
    <h1>I Sentieri Mitici</h1>
    <p class="ev-text">Le vostre scelte hanno lasciato un segno nel mondo. Tre sentieri si aprono davanti alla compagnia: sceglietene uno insieme. Cambierà per sempre i vostri poteri e il destino di Vael.</p>
    <div class="paths">${s.mythicOpts.map((o, i) => {
      const m = MYTHIC[o.id];
      return `<button class="path ${myVote === i ? 'voted' : ''}" style="--mc:${m.color}" ${o.ok ? '' : 'disabled'} data-act="vote" data-idx="${i}">
        <div class="pi">${m.icon}</div><h3>${m.name}</h3><div class="score">Affinità: ${o.score}</div>
        <p>${esc(m.desc)}</p><ul>${m.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${o.ok ? '' : '<div class="lock">🔒 Le vostre azioni non vi hanno condotto qui</div>'}${voteBar(app, i)}</button>`;
    }).join('')}</div>${voteFooter(app)}
  </div>`;
}

export function renderEnding(app) {
  const e = app.state.ending;
  return `<div class="modal-box ending">
    <div class="sunrise"></div>
    <h1>${esc(e.title)}</h1>
    <div class="ev-text">${nl2p(e.text)}</div>
    ${e.notes?.length ? `<ul class="gains">${e.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    <h4>I Viandanti</h4><div class="end-heroes">${app.state.heroes.map((h) => `<div><img src="${heroPortrait(h, 3)}" alt=""><b>${esc(h.name)}</b><small>${CLASSES[h.cls].name} · ${h.age} anni${h.alive ? '' : ' · caduto'}</small></div>`).join('')}</div>
    ${e.chronicle?.length ? `<details><summary>La cronaca completa</summary><ol class="chron">${e.chronicle.map((c) => `<li><small>Atto ${c.act}</small> ${esc(c.text)}</li>`).join('')}</ol></details>` : ''}
    ${e.tutorial ? '' : '<p class="muted">Gli eroi sopravvissuti sono diventati Leggende: potrete richiamarli in una nuova campagna.</p>'}
    ${app.me?.isHost ? (e.tutorial ? '<div class="btnrow"><button class="primary" data-act="tut_exit">Torna al menu principale</button></div>' : '<div class="btnrow"><button class="primary" data-act="to_lobby">Nuova campagna</button></div>') : ''}
  </div>`;
}

export function renderGameOver(app) {
  const s = app.state;
  return `<div class="modal-box gameover">
    <h1>La Cenere ha vinto</h1>
    <div class="ev-text"><p>${esc(s.gameover?.reason || '')}</p></div>
    ${app.me?.isHost ? `<div class="btnrow"><button data-act="load" data-file="autosalvataggio.json">Carica l'ultimo autosalvataggio</button><button class="primary" data-act="to_lobby">Torna alla lobby</button></div>` : '<p class="muted">In attesa dell\'host...</p>'}
  </div>`;
}

export { ITEMS, heroDerived };
