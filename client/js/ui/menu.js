// Menu principale dell'host: campagna locale, campagna online, tutorial
import { esc } from './util.js';

export const MODES = [
  { id: 'local', icon: '🏠', name: 'Campagna locale', desc: 'Un solo PC: crei fino a 4 eroi e li guidi tutti tu. I turni passano da un eroe all\'altro.' },
  { id: 'online', icon: '🌐', name: 'Campagna online', desc: 'Apri una stanza e invita gli amici con un codice o un link (in rete locale o via Internet).' },
  { id: 'abyss', icon: '🕳', name: 'Abisso Senza Fondo', desc: 'Solo combattimenti, piano dopo piano, all’infinito: nemici sempre più forti, mercanti, prove e un guardiano ogni 5 piani. Si gioca anche online (scegli «Abisso» nella lobby).' },
  { id: 'tutorial', icon: '📖', name: 'Tutorial', desc: 'Una breve avventura guidata con tre eroi già pronti: ti mostra passo passo tutte le funzionalità.' },
];

export function renderTitle(app) {
  const name = app.me ? (app.players.find((p) => p.id === app.me.playerId)?.name || '') : (localStorage.getItem('vael_name') || '');
  const inGame = app.state && app.state.phase !== 'lobby' && app.state.phase !== 'ending' && app.state.phase !== 'gameover';
  return `<div class="join title-menu">
    <h1>Ceneri di Vael</h1><div class="subtitle">Il sole è spezzato. Le lanterne si spengono.</div>
    <div class="panel menu-panel">
      <label>Il tuo nome <input id="joinName" maxlength="20" value="${esc(name)}" placeholder="Viandante"></label>
      ${inGame ? '<button class="primary big" data-act="menu_resume">▶ Continua la partita in corso</button>' : ''}
      <div class="mode-list">${MODES.map((m) => `<button class="mode-card" data-act="choose_mode" data-mode="${m.id}">
        <span class="mi">${m.icon}</span><span class="mt"><b>${m.name}</b><small>${esc(m.desc)}</small></span></button>`).join('')}</div>
      ${inGame ? '<p class="muted small">Scegliere una nuova modalità chiuderà la partita in corso (salvala prima dal menu ☰).</p>' : ''}
    </div>
  </div>`;
}
