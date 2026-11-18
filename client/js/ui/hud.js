// HUD: barra superiore, schede del gruppo, diario/chat, pannello di viaggio, menu
import { CLASSES } from '/shared/data/classes.js';
import { ACTS, MYTHIC, BIOMES, FACTIONS, LORE } from '/shared/data/mythic.js';
import { heroDerived, JOURNEY, hkey } from '/shared/rules.js';
import { heroPortrait } from '../render/pixel.js';
import { d6Html } from '../render/dice.js';
import { esc, bar, nl2p } from './util.js';

const POI_NAMES = { town: 'Città', merchant: 'Mercante', camp: 'Accampamento', beacon: 'Faro', crystal: 'Cristallo Spento', shrine: 'Santuario', den: 'Covo', event: 'Evento', story: 'Storia ★', boss: 'Boss' };

export function renderTop(app) {
  const s = app.state;
  const act = ACTS[s.act];
  const fate = Array.from({ length: s.fateMax }, (_, i) => `<span class="spark ${i < s.fate ? 'on' : ''}"></span>`).join('');
  const th = s.threat;
  return `
    <div class="topbar">
      <div class="tb-left"><div class="act">${esc(act?.name || '')}</div><div class="day">Giorno ${s.day}${s.mythic ? ` · <span style="color:${MYTHIC[s.mythic].color}">${MYTHIC[s.mythic].icon} ${MYTHIC[s.mythic].name}</span>` : ''}</div></div>
      <div class="tb-center">
        <div class="threat" title="Cenere Marea: avanza ogni giorno e con alcune scelte. A 100% la partita è persa. Accendete i Fari per respingerla.">
          <div class="th-label">Cenere Marea <b>${th}%</b></div>
          <div class="th-bar"><div class="th-fill" style="width:${th}%"></div>${[25, 50, 75].map((x) => `<i style="left:${x}%"></i>`).join('')}</div>
        </div>
        <div class="fate" title="Scintille del Fato: risorsa condivisa per ritirare i dadi, evocare e sfuggire alla morte">${fate}<small>Fato</small></div>
        <div class="res" title="Oro">🪙 ${s.gold}</div>
        <div class="res ${s.rations < s.heroes.filter((h) => h.alive).length ? 'low' : ''}" title="Razioni: ogni eroe ne mangia una a fine giornata">🍖 ${s.rations}</div>
        ${s.crystals ? `<div class="res" title="Cristalli risvegliati: sbloccano i mestieri secondari">💎 ${s.crystals}</div>` : ''}
      </div>
      <div class="tb-right">
        <div class="plist">${app.players.map((p) => `<span class="pdot ${p.connected ? '' : 'off'}" style="background:${p.color}" title="${esc(p.name)}${p.connected ? '' : ' (disconnesso)'}">${esc(p.name[0] || '?')}</span>`).join('')}</div>
        <span class="ping ${app.ping > 200 ? 'bad' : ''}">${app.ping} ms</span>
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
    }
    return cardHtml(h, h.hp, d.maxHp, h.mp, d.maxMp, owner, mine, pend, false, h.alive) + combatInfo;
  }).join('');
}
function cardHtml(h, hp, mhp, mp, mmp, owner, mine, pend, active, alive, u) {
  const st = u ? Object.keys(u.statuses || {}).join(' ') : '';
  return `<div class="hcard ${active ? 'active' : ''} ${alive ? '' : 'dead'} ${mine ? 'mine' : ''}" data-act="sheet" data-hero="${h.id}" style="--pc:${owner?.color || '#888'}">
    <img class="portrait" src="${heroPortrait(h, 2)}" alt="">
    <div class="hc-body">
      <div class="hc-name">${esc(h.name)} <small>Lv${h.level}</small>${pend ? `<span class="lvup" title="Scelte di livello in sospeso">▲${pend}</span>` : ''}</div>
      <div class="hc-cls">${CLASSES[h.cls].icon} ${CLASSES[h.cls].name}${u ? ` · ${u.row ? 'Retro' : 'Fronte'}` : ''}</div>
      ${bar(hp, mhp, 'hp')}${bar(mp, mmp, 'mp')}
      ${st ? `<div class="hc-st">${esc(st)}</div>` : ''}
    </div>
    ${alive ? '' : '<div class="dead-mark">✝</div>'}
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
  if (!t) return '';
  const mine = (heroId) => app.canControl(s.heroes.find((h) => h.id === heroId));
  if (t.stage === 'roll') {
    return `<div class="travel">
      <div class="tr-title">Giorno ${s.day} — Alba sul crepuscolo</div>
      <p class="muted">Ogni eroe tira un dado. Poi decidete insieme come usarli: camminare, foraggiare, fare la guardia o cercare tesori. Usare un dado nella <b>specialità</b> dell'eroe gli dà +1.</p>
      <button class="primary big" data-act="travel_roll">🎲 Tira la Riserva del Cammino</button>
    </div>`;
  }
  if (t.stage === 'assign') {
    const rolling = app.ui.lastPoolRoll !== t.rollId;
    if (rolling) setTimeout(() => { app.ui.lastPoolRoll = t.rollId; }, 1200);
    const all = t.pool.every((p) => p.assign);
    return `<div class="travel">
      <div class="tr-title">Assegnate i dadi del giorno</div>
      <div class="pool">${t.pool.map((p) => {
        const h = s.heroes.find((x) => x.id === p.heroId);
        const can = mine(p.heroId);
        return `<div class="pdie ${p.assign ? 'set' : ''}">
          <div class="pd-head"><img src="${heroPortrait(h, 1)}" alt=""><span>${esc(h.name)}</span></div>
          ${d6Html(p.v, rolling)}
          <div class="pd-opts">${Object.entries(JOURNEY).map(([k, j]) => `<button class="jf ${p.assign === k ? 'sel' : ''} ${p.face === k ? 'spec' : ''}" ${can ? '' : 'disabled'} data-act="travel_assign" data-hero="${p.heroId}" data-face="${k}" title="${esc(j.name)}: ${esc(j.desc)}${p.face === k ? ' — SPECIALITÀ (+1)' : ''}">${j.icon}</button>`).join('')}</div>
          <small>${p.assign ? JOURNEY[p.assign].name + (p.assign === p.face ? ' +1' : '') : can ? 'Scegli' : 'In attesa...'}</small>
        </div>`;
      }).join('')}</div>
      <button class="primary" data-act="travel_confirm" ${all || app.me?.isHost ? '' : 'disabled'}>${all ? 'Conferma e parti' : app.me?.isHost ? 'Conferma (i dadi liberi vanno al Cammino)' : 'In attesa di tutti...'}</button>
    </div>`;
  }
  // move
  const hungry = s.heroes.filter((h) => h.alive).length;
  return `<div class="travel move">
    <div class="steps"><b>${t.steps}</b><small>passi</small></div>
    <div class="tr-hint">${t.steps ? 'Clicca una casella illuminata per muovere il gruppo. Trascina per spostare la visuale, rotellina per lo zoom, <kbd>C</kbd> per centrare.' : 'Nessun passo rimasto.'}${t.vedetta ? `<br><small>Vedetta attiva: ${t.vedetta}</small>` : ''}</div>
    <button class="${t.steps ? '' : 'primary'}" data-act="end_day">🌙 Termina giornata <small>(🍖 −${hungry})</small></button>
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
  if (tile.q === s.party.q && tile.r === s.party.r) txt += '<br><i>Il gruppo è qui</i>';
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
<h4>Il viaggio</h4><p>Ogni giornata il gruppo tira la <b>Riserva del Cammino</b>: un dado per eroe. Ogni giocatore assegna i dadi dei propri eroi a <b>Cammino</b> (passi), <b>Foraggio</b> (razioni), <b>Vedetta</b> (meno agguati, vista più ampia) o <b>Ricerca</b> (oro e oggetti). La specialità della classe dà +1. A fine giornata ogni eroe consuma una razione e la <b>Cenere Marea</b> avanza.</p>
<h4>Prove e Fato</h4><p>Le scelte degli eventi si votano (maggioranza, l'host spareggia). Le prove si risolvono con <b>d20 + modificatore</b> contro una <b>CD</b>: scegliete l'eroe più adatto. Un fallimento può essere ritirato spendendo una <b>Scintilla del Fato</b>, risorsa condivisa.</p>
<h4>Battaglia</h4><p>Gli schieramenti hanno due file: la <b>fila avanti</b> protegge quella dietro dagli attacchi corpo a corpo. Archi, bastoni, lanterne e magie colpiscono ovunque. Ogni nemico ha una <b>Guardia</b> 🛡: colpirne le <b>debolezze</b> la riduce; a zero il nemico è <b>Spezzato</b>, salta il turno e subisce +50% danni. Usate <b>Slancio</b> per caricare il colpo successivo (fino a ×2.5), <b>Analizza</b> per scoprire le debolezze, e i <b>Concerti</b> tra eroi legati.</p>
<h4>Combinazioni</h4><p>Bagnato + Fulmine = danno doppio. Congelato + Botta = Frantumato. Marchiato = +25% danni e più critici. Stordito/Spezzato/Marchiato + Pugnalata = colpo alle spalle.</p>
<h4>Crescita</h4><p>A ogni livello si sceglie un talento; al livello 3 una sottoclasse. Risvegliando i <b>Cristalli</b> si apprende un mestiere secondario. Gli eroi stringono <b>legami</b> agli accampamenti e vengono segnati da <b>trasformazioni</b> e cicatrici. A fine Atto I le vostre scelte aprono i <b>Sentieri Mitici</b>.</p>
<h4>Comandi</h4><p>Trascina per spostare la visuale, rotellina per lo zoom, frecce/WASD per scorrere, <kbd>C</kbd> o spazio per centrare sul gruppo. Clicca un eroe per la sua scheda.</p>`;
