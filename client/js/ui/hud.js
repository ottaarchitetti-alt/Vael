// HUD: barra superiore, schede del gruppo, diario/chat, pannello di viaggio, menu
import { CLASSES } from '/shared/data/classes.js';
import { ACTS, MYTHIC, BIOMES, FACTIONS, LORE } from '/shared/data/mythic.js';
import { heroDerived, JOURNEY, hkey, STATUSES } from '/shared/rules.js';
import { heroPortrait } from '../render/rig.js';
import { d6Html } from '../render/dice.js';
import { esc, bar, nl2p } from './util.js';

const POI_NAMES = { town: 'Città', merchant: 'Mercante', camp: 'Accampamento', beacon: 'Faro', crystal: 'Cristallo Spento', shrine: 'Santuario', den: 'Covo', event: 'Evento', story: 'Storia ★', boss: 'Boss' };

// Clessidra di cenere: la sabbia scende dall'alto al basso man mano che la Cenere Marea avanza
function hourglass(th) {
  const k = Math.max(0, Math.min(100, th)) / 100;
  const sand = th >= 75 ? '#c8643a' : '#9a9088';
  return `<svg class="hourglass" viewBox="0 0 20 30" aria-hidden="true">
    <defs><clipPath id="hg-glass"><path d="M5 3 C5 11 9 13 9 15 C9 17 5 19 5 27 L15 27 C15 19 11 17 11 15 C11 13 15 11 15 3 Z"/></clipPath></defs>
    <g clip-path="url(#hg-glass)">
      <rect x="0" y="${(3 + 12 * k).toFixed(1)}" width="20" height="${(12 * (1 - k)).toFixed(1)}" fill="${sand}"/>
      <rect x="0" y="${(27 - 12 * k).toFixed(1)}" width="20" height="${(12 * k).toFixed(1)}" fill="${sand}"/>
      ${k > 0 && k < 1 ? `<rect class="hg-stream" x="9.5" y="15" width="1" height="${(12 - 12 * k).toFixed(1)}" fill="${sand}"/>` : ''}
    </g>
    <path d="M5 3 C5 11 9 13 9 15 C9 17 5 19 5 27 L15 27 C15 19 11 17 11 15 C11 13 15 11 15 3 Z" fill="rgba(210,200,230,.08)" stroke="#9a90a8" stroke-width=".8"/>
    <rect x="2" y="1" width="16" height="2.4" rx=".6" fill="#8a6a3a"/><rect x="2" y="26.6" width="16" height="2.4" rx=".6" fill="#8a6a3a"/>
  </svg>`;
}

export function renderTop(app) {
  const s = app.state;
  const act = ACTS[s.act];
  const fate = Array.from({ length: s.fateMax }, (_, i) => `<span class="flame ${i < s.fate ? 'on' : ''}" style="--d:${(i * 0.37).toFixed(2)}s"><i></i></span>`).join('');
  const th = s.threat;
  return `
    <div class="topbar">
      <div class="tb-left"><div class="act">${s.tutorial ? '📖 Tutorial — La prova dei Viandanti' : esc(act?.name || '')}</div><div class="day">Giorno ${s.day}${s.mythic ? ` · <span style="color:${MYTHIC[s.mythic].color}">${MYTHIC[s.mythic].icon} ${MYTHIC[s.mythic].name}</span>` : ''}</div></div>
      <div class="tb-center">
        <div class="threat ${th >= 75 ? 'dire' : ''}" title="Cenere Marea: avanza ogni giorno e con alcune scelte. A 100% la partita è persa. Accendete i Fari per respingerla.">
          ${hourglass(th)}
          <div class="th-body"><div class="th-label">Cenere Marea <b>${th}%</b></div>
          <div class="th-bar"><div class="th-fill" style="width:${th}%"></div>${[25, 50, 75].map((x) => `<i style="left:${x}%"></i>`).join('')}</div></div>
        </div>
        <div class="fate" title="Scintille del Fato (${s.fate}/${s.fateMax}): risorsa condivisa per ritirare i dadi, evocare e sfuggire alla morte"><small>Fato</small>${fate}</div>
        <div class="res" title="Oro">🪙 ${s.gold}</div>
        <div class="res ${s.rations < s.heroes.filter((h) => h.alive).length ? 'low' : ''}" title="Razioni: ogni eroe ne mangia una a fine giornata">🍖 ${s.rations}</div>
        ${s.crystals ? `<div class="res" title="Cristalli risvegliati: sbloccano i mestieri secondari">💎 ${s.crystals}</div>` : ''}
      </div>
      <div class="tb-right">
        <div class="plist">${app.players.map((p) => `<span class="pdot ${p.connected ? '' : 'off'}" style="background:${p.color}" title="${esc(p.name)}${p.connected ? '' : ' (disconnesso)'}">${esc(p.name[0] || '?')}</span>`).join('')}</div>
        ${s.mode === 'local' ? '' : `<span class="ping ${app.ping > 200 ? 'bad' : ''}">${app.ping} ms</span>`}
        <button class="icon" data-act="menu" title="Menu">☰</button>
      </div>
    </div>`;
}

export function renderParty(app) {
  const s = app.state;
  return s.heroes.map((h) => {
    const d = heroDerived(h, s);
    const owner = app.players.find((p) => p.id === h.owner);
    const mine = app.canControl(h);
    const pend = (h.pendingTalents?.length || 0) + (h.pendingSub ? 1 : 0);
    let combatInfo = '';
    if (s.phase === 'combat' && s.combat) {
      const u = s.combat.units.find((x) => x.heroId === h.id);
      if (u) return cardHtml(h, u.hp, u.maxHp, u.mp, u.maxMp, owner, mine, pend, s.combat.active === u.id, u.alive, u);
      return cardHtml(h, h.hp, d.maxHp, h.mp, d.maxMp, owner, mine, pend, false, h.alive, null, 'Lontano dalla battaglia');
    }
    const turn = s.phase === 'map' && s.travel?.order?.[s.travel.cur] === h.id;
    return cardHtml(h, h.hp, d.maxHp, h.mp, d.maxMp, owner, mine, pend, turn, h.alive) + combatInfo;
  }).join('');
}
function cardHtml(h, hp, mhp, mp, mmp, owner, mine, pend, active, alive, u, away) {
  const st = u ? Object.keys(u.statuses || {}).map((k) => `<span title="${esc(STATUSES[k]?.name || k)}">${STATUSES[k]?.icon || '•'}</span>`).join('') : '';
  const low = alive && mhp && hp / mhp < 0.3;
  return `<div class="hcard ${active ? 'active' : ''} ${alive ? '' : 'dead'} ${mine ? 'mine' : ''} ${low ? 'low' : ''} ${away ? 'away' : ''}" data-act="sheet" data-hero="${h.id}" style="--pc:${owner?.color || '#888'}" title="${esc(h.name)} — apri la scheda">
    <div class="hc-face"><img class="portrait" src="${heroPortrait(h, 2)}" alt="">${pend ? `<span class="lvup" title="Scelte di livello in sospeso">▲${pend}</span>` : ''}</div>
    <div class="hc-body">
      <div class="hc-name">${esc(h.name)} <small>Lv ${h.level}</small></div>
      <div class="hc-cls">${CLASSES[h.cls].icon} ${CLASSES[h.cls].name}${u ? ` · ${u.row ? 'Retro' : 'Fronte'}` : ''}${u?.charge ? ` · <b class="chg">${'◆'.repeat(u.charge)}</b>` : ''}</div>
      <div class="hc-bars"><label>PV</label>${bar(hp, mhp, 'hp')}<label>PM</label>${bar(mp, mmp, 'mp')}</div>
      ${st ? `<div class="hc-st">${st}</div>` : ''}
    </div>
    ${alive ? '' : '<div class="dead-mark">✝</div>'}
    ${active ? '<div class="hc-turn">Turno</div>' : ''}${away ? `<div class="hc-away">${away}</div>` : ''}
  </div>`;
}

export function renderLogList(app) {
  const s = app.state;
  const tab = app.ui.logTab || 'log';
  const list = (s.log || []).filter((l) => (tab === 'chat' ? l.k === 'chat' || l.k === 'sys' : true)).slice(-80);
  return list.map((l) => `<div class="le ${l.k}">${esc(l.t)}</div>`).join('');
}

export function renderTravel(app) {
  const s = app.state, t = s.travel;
  if (!t?.order) return '';
  const hero = (id) => s.heroes.find((h) => h.id === id);
  const h = hero(t.order[t.cur]);
  if (!h) return '';
  const owner = app.players.find((p) => p.id === h.owner);
  const mine = app.canControl(h);
  const next = t.order.slice(t.cur + 1).map(hero).find((x) => x?.alive);
  // ordine della giornata (per velocità)
  const order = `<div class="day-order"><span class="do-label">Giorno ${s.day}</span>${t.order.map((id, i) => {
    const x = hero(id); if (!x) return '';
    const st = i < t.cur || t.done?.includes(id) ? 'done' : i === t.cur ? 'cur' : x.alive ? '' : 'dead';
    return `<span class="do-h ${st}" title="${esc(x.name)}${i === t.cur ? ' — di turno' : st === 'done' ? ' — ha già viaggiato' : ''}"><img src="${heroPortrait(x, 1)}" alt=""></span>`;
  }).join('<i class="do-sep">›</i>')}<span class="do-night" title="Dopo l'ultimo eroe cala la notte">🌙</span></div>`;
  const who = `<div class="tr-title">Turno di <b>${esc(h.name)}</b>${mine ? '' : ` — <span style="color:${owner?.color || '#aaa'}">${esc(owner?.name || '')}</span> sta giocando`}</div>`;
  const endBtn = `<button class="${t.stage === 'move' && !t.steps ? 'primary' : ''}" data-act="end_turn" ${mine || app.me?.isHost ? '' : 'disabled'}>${next ? `Termina turno <small>→ ${esc(next.name)}</small>` : '🌙 Termina turno <small>(cala la notte)</small>'}</button>`;
  if (t.stage === 'roll') {
    return `<div class="travel">${order}${who}
      <p class="muted small">${esc(h.name)} tira il suo dado del cammino, sceglie come usarlo e poi si muove. Dopo di lui tocca al prossimo, in ordine di velocità.</p>
      <div class="btnrow"><button class="primary big" data-act="travel_roll" ${mine ? '' : 'disabled'}>🎲 Tira il dado di ${esc(h.name)}</button></div>
    </div>`;
  }
  if (t.stage === 'assign') {
    const d = t.die;
    const rolling = app.ui.lastPoolRoll !== t.rollId;
    if (rolling) setTimeout(() => { app.ui.lastPoolRoll = t.rollId; }, 1200);
    const spec = d.assign && d.assign === d.face;
    const val = Math.min(7, d.v + (spec ? 1 : 0));
    const preview = !d.assign ? 'Scegli un uso' : d.assign === 'passi' ? `${val + 4} passi` : `${JOURNEY[d.assign].name} ${val} · 3 passi`;
    return `<div class="travel">${order}${who}
      <div class="die-row">
        <div class="pd-val">${d6Html(d.v, rolling)}${spec ? '<span class="pd-bonus" title="Specialità della classe">+1</span>' : ''}</div>
        <div class="pd-opts big">${Object.entries(JOURNEY).map(([k, j]) => `<button class="jf ${d.assign === k ? 'sel' : ''} ${d.face === k ? 'spec' : ''}" ${mine ? '' : 'disabled'} data-act="travel_assign" data-face="${k}" title="${esc(j.name)}: ${esc(j.desc)}${d.face === k ? ' — SPECIALITÀ (+1)' : ''}${d.assign === k ? ' — clicca di nuovo per togliere' : ''}">${j.icon}<span>${j.name}</span>${d.face === k ? '<i>+1</i>' : ''}</button>`).join('')}</div>
      </div>
      <div class="die-sum">${preview}${d.assign && mine ? ' <button class="ghost small" data-act="travel_unassign" title="Togli la scelta (e il +1)">↺ Annulla</button>' : ''}</div>
      <div class="btnrow"><button class="primary" data-act="travel_confirm" ${mine && d.assign ? '' : 'disabled'}>Conferma</button></div>
    </div>`;
  }
  return `<div class="travel move">${order}
    <div class="move-row">
      <div class="steps"><b>${t.steps}</b><small>passi</small></div>
      <div class="tr-hint"><b>${esc(h.name)}</b>: ${t.steps ? 'clicca una casella illuminata per muoverti. Passando su un luogo lo attivi; alle battaglie accorrono gli eroi entro 3 caselle.' : 'nessun passo rimasto.'}${t.vedetta ? `<br><small>Vedetta del giorno: ${t.vedetta}</small>` : ''}</div>
      ${endBtn}
    </div>
  </div>`;
}

export function tileTooltip(app, tile) {
  if (!tile) return '';
  const bd = BIOMES[tile.b];
  if (!tile.rev) return '<b>Terra inesplorata</b>';
  const poi = tile.poi;
  const s = app.state;
  let txt = `<b>${esc(bd.name)}</b>`;
  if (poi) txt += `<br>${POI_NAMES[poi.t] || ''}${poi.name ? ': ' + esc(poi.name) : ''}${poi.done && !['town', 'merchant', 'camp'].includes(poi.t) ? ' <i>(visitato)</i>' : ''}${poi.lit ? ' <i>(acceso)</i>' : ''}`;
  if (bd.blocked) txt += '<br><i>Invalicabile</i>';
  else if (bd.danger) txt += `<br><small>Pericolo: ${Math.round(bd.danger + s.threat / 5 + (tile.cor ? 12 : 0))}</small>`;
  if (tile.cor) txt += '<br><span class="bad">Corrotta dalla Cenere</span>';
  const here = s.heroes.filter((h) => h.pos && h.pos.q === tile.q && h.pos.r === tile.r);
  if (here.length) txt += `<br><i>Qui: ${here.map((h) => esc(h.name) + (h.alive ? '' : ' ✝')).join(', ')}</i>`;
  return txt;
}

export function renderMenu(app) {
  const s = app.state;
  const isHost = app.me?.isHost;
  const inv = app.invite || {};
  const tab = app.ui.menuTab || 'gioco';
  const tabs = [['gioco', 'Partita'], ['fazioni', 'Fazioni'], ['cronaca', 'Cronaca'], ['guida', 'Guida'], ['mondo', 'Il Mondo']];
  let body = '';
  if (tab === 'gioco') {
    body = `
      ${isHost ? `<div class="mrow"><input id="saveName" placeholder="Nome del salvataggio" value="${esc(app.ui.saveName ?? s.campaignName ?? '')}" data-uikey="saveName"><button class="primary" data-act="save">💾 Salva</button></div>
      <div class="mrow"><button data-act="show_saves">📂 Carica una partita</button>${s.phase === 'gameover' || s.phase === 'ending' ? '' : ''}<button data-act="to_lobby" class="danger">Torna alla lobby</button></div>
      ${app.ui.saves ? `<div class="saves">${app.ui.saves.map((sv) => `<div class="save"><div><b>${esc(sv.name)}</b><br><small>Atto ${sv.act} · giorno ${sv.day} · ${new Date(sv.date).toLocaleString('it-IT')}</small></div><button data-act="load" data-file="${esc(sv.file)}">Carica</button></div>`).join('') || '<p class="muted">Nessun salvataggio</p>'}</div>` : ''}` : '<p class="muted">Solo l\'host può salvare e caricare. Il gioco si salva automaticamente alle locande, ogni 5 giorni e a ogni capitolo.</p>'}
      <h4>Invita</h4>
      <div class="code">Codice <b>${esc(inv.code || app.code)}</b></div>
      ${inv.publicUrl ? `<div class="link"><span class="tag ok">Internet</span><input readonly value="${esc(inv.publicUrl)}/?code=${esc(inv.code)}"><button data-act="copy" data-text="${esc(inv.publicUrl)}/?code=${esc(inv.code)}">Copia</button></div>` : ''}
      ${(inv.lan || []).map((u) => `<div class="link"><span class="tag">LAN</span><input readonly value="${esc(u)}/?code=${esc(inv.code)}"><button data-act="copy" data-text="${esc(u)}/?code=${esc(inv.code)}">Copia</button></div>`).join('')}
      <h4>Grafica</h4>
      <div class="mrow"><button data-act="quality" data-q="alta" class="${app.engine.quality === 'alta' ? 'sel' : ''}">Alta (ombre, bloom)</button><button data-act="quality" data-q="bassa" class="${app.engine.quality === 'bassa' ? 'sel' : ''}">Bassa (PC lenti)</button></div>`;
  } else if (tab === 'fazioni') {
    body = Object.entries(FACTIONS).filter(([k]) => k !== 'eclipse').map(([k, f]) => `<div class="fac"><b style="color:${f.color}">${f.icon} ${f.name}</b> <span class="rep">${(s.rep?.[k] || 0) > 0 ? '+' : ''}${s.rep?.[k] || 0}</span><br><small>${esc(f.desc)}</small></div>`).join('')
      + `<h4>Inclinazioni del gruppo</h4>${Object.entries(MYTHIC).map(([k, m]) => `<div class="fac"><b style="color:${m.color}">${m.icon} ${m.name}</b> <span class="rep">${s.moral?.[k] || 0}</span></div>`).join('')}`;
  } else if (tab === 'cronaca') {
    body = (s.chronicle || []).length ? `<ol class="chron">${s.chronicle.map((c) => `<li><small>Atto ${c.act}</small> ${esc(c.text)}</li>`).join('')}</ol>` : '<p class="muted">La vostra storia è ancora da scrivere.</p>';
  } else if (tab === 'guida') {
    body = GUIDE;
  } else body = `<div class="lore-text">${nl2p(LORE)}</div>`;
  return `<div class="modal-box menu"><button class="close" data-act="close_modal">✕</button>
    <div class="tabs">${tabs.map(([k, n]) => `<button class="${tab === k ? 'sel' : ''}" data-act="menu_tab" data-tab="${k}">${n}</button>`).join('')}</div>
    <div class="menu-body">${body}</div></div>`;
}

const GUIDE = `
<h4>Il viaggio</h4><p>Ogni eroe ha la sua pedina. Ogni giornata gli eroi giocano <b>uno alla volta, dal più veloce</b>: tirano il proprio dado e lo usano per <b>Cammino</b> (passi), <b>Foraggio</b> (razioni), <b>Vedetta</b> (meno agguati, vista più ampia) o <b>Ricerca</b> (oro e oggetti). La specialità della classe dà +1; con ↺ Annulla si toglie un'assegnazione (e il suo +1). A fine giornata ogni eroe consuma una razione e la <b>Cenere Marea</b> avanza.</p>
<h4>Prove e Fato</h4><p>Le scelte degli eventi si votano (maggioranza, l'host spareggia). Le prove si risolvono con <b>d20 + modificatore</b> contro una <b>CD</b>: scegliete l'eroe più adatto. Un fallimento può essere ritirato spendendo una <b>Scintilla del Fato</b>, risorsa condivisa.</p>
<h4>Battaglia</h4><p>Gli schieramenti hanno due file: la <b>fila avanti</b> protegge quella dietro dagli attacchi corpo a corpo. Archi, bastoni, lanterne e magie colpiscono ovunque. Ogni nemico ha una <b>Guardia</b> 🛡: colpirne le <b>debolezze</b> la riduce; a zero il nemico è <b>Spezzato</b>, salta il turno e subisce +50% danni. Ogni arma ha due <b>mosse proprie</b> (fendenti, colpi ad area, tiri a distanza): cambiando arma cambiano anche gli attacchi. Usate <b>Slancio</b> per caricare il colpo successivo (fino a ×2.5), <b>Analizza</b> per scoprire le debolezze, e i <b>Concerti</b> tra eroi legati.</p>
<h4>Combinazioni</h4><p>Bagnato + Fulmine = danno doppio. Congelato + Botta = Frantumato. Marchiato = +25% danni e più critici. Stordito/Spezzato/Marchiato + Pugnalata = colpo alle spalle.</p>
<h4>Crescita</h4><p>A ogni livello si sceglie un talento; al livello 3 una sottoclasse. Risvegliando i <b>Cristalli</b> si apprende un mestiere secondario. Gli eroi stringono <b>legami</b> agli accampamenti e vengono segnati da <b>trasformazioni</b> e cicatrici. A fine Atto I le vostre scelte aprono i <b>Sentieri Mitici</b>.</p>
<h4>Comandi</h4><p>Trascina per spostare la visuale, rotellina per lo zoom, frecce/WASD per scorrere, <kbd>Q</kbd>/<kbd>E</kbd> (o tasto destro trascinato) per ruotare la mappa, <kbd>C</kbd> o spazio per centrare sul gruppo. Clicca un eroe per la sua scheda.</p>`;
