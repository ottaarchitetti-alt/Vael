// Guida del tutorial: suggerimenti contestuali che spiegano ogni funzionalità quando compare per la prima volta.
import { esc } from './util.js';

const anyEnemy = (s, fn) => s.combat?.units.some((u) => u.side === 'enemy' && u.alive && fn(u));
const heroTurn = (s) => { const c = s.combat; const u = c?.units.find((x) => x.id === c.active); return c?.phase === 'fight' && u?.side === 'hero' && !u.acted; };

// Ordine = priorità: viene mostrato il primo suggerimento non ancora letto la cui condizione è vera.
export const TIPS = [
  { id: 'eventi', title: 'Gli eventi', when: (s) => s.phase === 'event' && s.event?.stage === 'choose',
    text: 'Gli eventi raccontano la storia. Scegli un\'opzione: alcune danno ricompense subito, altre richiedono una <b>prova</b>. Le scelte cambiano reputazione con le fazioni e aprono i <b>Sentieri Mitici</b> della campagna vera. In una partita online ogni giocatore vota e l\'host spareggia.' },
  { id: 'risultato', title: 'Esito e ricompense', when: (s) => s.phase === 'event' && s.event?.stage === 'result',
    text: 'Qui vedi cosa è successo e cosa avete ottenuto. Premi <b>Continua</b> per tornare alla mappa.' },
  { id: 'hud', title: 'L\'interfaccia', when: (s) => s.phase === 'map',
    text: 'In alto: atto e giorno, la <b>Cenere Marea</b> (a 100% la partita è persa), le <b>Scintille del Fato</b>, l\'oro 🪙 e le razioni 🍖.<br>In basso ci sono i tuoi eroi con <b>PV</b> (vita) e <b>PM</b> (mana): clicca un eroe per aprire la sua scheda.<br>A destra: il diario e le <b>missioni</b> (clicca la freccia di una missione per vederla sulla mappa).' },
  { id: 'riserva', title: 'Turni sulla mappa', when: (s) => s.phase === 'map' && s.travel?.stage === 'roll',
    text: 'Ogni eroe ha la sua <b>pedina</b>. Ogni giornata gli eroi giocano <b>uno alla volta, dal più veloce</b> (l’ordine è nella barra del pannello). L’eroe di turno ha un anello dorato: premi <b>Tira il dado</b>.' },
  { id: 'dadi', title: 'Usare il dado', when: (s) => s.phase === 'map' && s.travel?.stage === 'assign',
    text: '👣 <b>Cammino</b>: valore del dado + 4 passi · 🍖 <b>Foraggio</b>: razioni · 👁 <b>Vedetta</b>: meno agguati notturni · 🔍 <b>Ricerca</b>: oro e oggetti nella casella. Con gli usi diversi dal Cammino restano comunque 3 passi.<br>Il pulsante con <b>+1</b> è la <b>specialità</b> dell’eroe. Ricliccare una scelta (o <b>↺ Annulla</b>) la toglie insieme al +1. Poi <b>Conferma</b>.' },
  { id: 'muovi', title: 'Muoversi sulla mappa', when: (s) => s.phase === 'map' && s.travel?.stage === 'move' && s.travel.steps > 0,
    text: 'Le caselle illuminate sono raggiungibili: cliccane una. Chi passa su un luogo (città, evento ★, faro, accampamento...) lo attiva. Alle battaglie accorrono solo gli eroi entro 3 caselle: chi resta indietro non può aiutare, quindi conviene non separarsi troppo. Per il boss finale serve il gruppo riunito.<br>Trascina per spostare la visuale, rotellina per lo zoom, <kbd>Q</kbd>/<kbd>E</kbd> o tasto destro trascinato per ruotare la mappa, <kbd>C</kbd> per ricentrare.' },
  { id: 'notte', title: 'Fine del turno', when: (s) => s.phase === 'map' && s.travel?.stage === 'move' && s.travel.steps === 0,
    text: 'Premi <b>Termina turno</b>: tocca al prossimo eroe. Dopo l’ultimo cala la <b>notte</b>: ogni eroe mangia una razione, recupera un po’ di PM e la Cenere Marea avanza.' },
  { id: 'prova', title: 'Le prove: d20', when: (s) => s.phase === 'event' && s.event?.stage === 'roll',
    text: 'Una prova si risolve con <b>d20 + bonus</b> dell\'eroe contro la <b>CD</b> (Classe Difficoltà). Accanto a ogni eroe vedi il bonus e la probabilità di successo: scegli il più adatto. Un 20 naturale riesce sempre, un 1 fallisce sempre.' },
  { id: 'fato', title: 'Le Scintille del Fato', when: (s) => s.phase === 'event' && s.event?.stage === 'rolled' && s.event.roll && !s.event.roll.success,
    text: 'Fallito! Puoi spendere una <b>Scintilla del Fato</b> per ritirare il dado. Le Scintille sono condivise dal gruppo: servono anche per le evocazioni e per salvarvi da una sconfitta. Prova a ritirare.' },
  { id: 'citta', title: 'Le città', when: (s) => s.phase === 'town',
    text: '🛏 <b>Locanda</b>: cura tutto e salva · ⛪ <b>Cappella</b>: rianima i caduti · ⚖ <b>Bottega</b>: compra e vendi · ⚒ <b>Fabbro</b>: potenzia l\'equipaggiamento · 🍺 <b>Taverna</b>: rivela la mappa e vende razioni. Esci con <b>Riparti</b>.' },
  { id: 'campo', title: 'L\'accampamento', when: (s) => s.phase === 'camp',
    text: 'Accampandosi si recupera il 40% di PV e PM. Due eroi condividono una scena: la vostra scelta crea un <b>legame</b> (amici, amanti o rivali) che dà bonus in battaglia e sblocca i <b>Concerti</b>, attacchi combinati.' },
  { id: 'battaglia', title: 'La battaglia', when: (s) => s.phase === 'combat' && s.combat?.phase === 'fight',
    text: 'In alto c\'è l\'<b>ordine dei turni</b>: ogni personaggio, eroe o nemico, agisce quando arriva il suo turno, in base alla velocità. Il turno attivo è segnato da un anello dorato e dalla scritta «Turno» sulla scheda in basso.<br>Ci sono due file: la <b>prima fila</b> protegge la seconda dagli attacchi corpo a corpo.' },
  { id: 'comandi', title: 'I comandi', when: (s) => s.phase === 'combat' && heroTurn(s),
    text: 'I primi due pulsanti sono le <b>mosse dell’arma</b> equipaggiata: la spada fa fendenti ad arco, la mazza ha un colpo diretto e uno Schianto su tutta la fila, arco, bastone, liuto e lanterna colpiscono <b>a distanza</b>.<br>✦ <b>Abilità</b> (costano PM) · ◆ <b>Slancio</b>: carica il colpo successivo fino a ×2.5 · 🛡 <b>Difendi</b>: dimezza i danni e recupera PM · 🎒 <b>Oggetti</b> · ⇠ <b>Avanza/Arretra</b> di fila · 🏃 <b>Fuga</b>.<br>Per scegliere il bersaglio clicca il nemico nella scena o nel menu.' },
  { id: 'debolezze', title: 'Guardia e debolezze', when: (s) => s.phase === 'combat' && anyEnemy(s, (u) => u.guard < u.maxGuard || u.known?.length),
    text: 'Sopra ogni nemico ci sono la <b>Guardia</b> 🛡 e le sue <b>debolezze</b> (❓ finché non le scopri). Colpire una debolezza fa +50% danni e toglie Guardia. Iris può usare <b>Analizza</b> per rivelarle tutte. Il Cenerario teme gelo, luce e taglio; il Lupo teme fuoco e taglio.' },
  { id: 'spezzato', title: 'Spezzato!', when: (s) => s.phase === 'combat' && anyEnemy(s, (u) => u.broken > 0),
    text: 'Guardia azzerata: il nemico è <b>Spezzato</b>. Salta il turno e subisce +50% danni: è il momento di usare i colpi più forti e lo Slancio accumulato!' },
  { id: 'vittoria', title: 'Vittoria', when: (s) => s.phase === 'combat' && s.combat?.phase === 'victory',
    text: 'Ogni vittoria dà <b>esperienza</b>, oro e a volte oggetti. Quando un eroe sale di livello compare ▲ sulla sua scheda in basso.' },
  { id: 'livello', title: 'Salire di livello', when: (s) => s.phase !== 'combat' && s.heroes.some((h) => h.pendingTalents?.length || h.pendingSub),
    text: 'Un eroe è salito di livello (▲)! Clicca la sua scheda in basso: nella scheda scegli un <b>talento</b>. Al livello 3 sceglierai anche una <b>sottoclasse</b>. Nella scheda trovi anche l\'<b>equipaggiamento</b> e la fila preferita.' },
  { id: 'faro', title: 'I Fari', when: (s) => s.phase === 'event' && s.event?.id === 'faro',
    text: 'Riaccendere un <b>Faro</b> fa arretrare la Cenere Marea e protegge le terre vicine dalla corruzione. Nella campagna vera ce ne sono diversi per atto.' },
  { id: 'cristallo', title: 'I Cristalli', when: (s) => s.phase === 'event' && s.event?.id === 'cristallo',
    text: 'Un <b>Cristallo</b> risvegliato permette a ogni eroe di imparare un <b>mestiere secondario</b> (dalla scheda dell\'eroe): le abilità di una seconda classe.' },
  { id: 'boss', title: 'Il boss', when: (s) => s.phase === 'combat' && s.combat?.boss && s.combat.phase === 'fight',
    text: 'I boss hanno più Guardia, possono <b>evocare</b> rinforzi e non si può fuggire. La Sentinella teme <b>fuoco</b>, <b>luce</b> e <b>botta</b>: Iris (Scheggia Ardente) e Bruna (Luce Sacra) sono le vostre armi migliori. Bruna può anche curare.' },
  { id: 'fine', title: 'Fine del tutorial', when: (s) => s.phase === 'ending',
    text: 'Complimenti! Ora conosci tutte le basi. Torna al menu per una campagna locale (tutti gli eroi su questo PC) o online (con gli amici).' },
];

export function renderCoach(app) {
  const s = app.state;
  if (!s?.tutorial) return '';
  const seen = app.ui.tutSeen ||= new Set();
  const open = app.ui.tutOpen;
  const tip = open ? TIPS.find((t) => t.id === open) : TIPS.find((t) => !seen.has(t.id) && t.when(s));
  const done = TIPS.filter((t) => seen.has(t.id)).length;
  if (app.ui.coachMin) {
    return `<div class="coach min"><button class="coach-head" data-act="coach_min">📖 Guida <small>${done}/${TIPS.length}</small> ▾</button></div>`;
  }
  return `<div class="coach ${tip ? 'has-tip' : ''}">
    <div class="coach-head"><span>📖 Guida del tutorial</span><small>${done}/${TIPS.length} argomenti</small><button class="ghost small" data-act="coach_min" title="Riduci">▴</button></div>
    ${tip ? `<div class="coach-tip"><h4>${esc(tip.title)}</h4><p>${tip.text}</p><button class="primary small" data-act="coach_ok" data-id="${tip.id}">Ho capito</button></div>`
      : '<p class="muted small coach-idle">Continua a giocare: un nuovo suggerimento comparirà quando servirà.</p>'}
    <details class="coach-list"><summary>Tutti gli argomenti</summary><ul>${TIPS.map((t) => `<li class="${seen.has(t.id) ? 'done' : ''}"><button class="linkish" data-act="coach_open" data-id="${t.id}">${seen.has(t.id) ? '✔' : '○'} ${esc(t.title)}</button></li>`).join('')}</ul></details>
  </div>`;
}
