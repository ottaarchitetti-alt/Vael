// Stato della campagna e dispatcher delle azioni (server autoritativo)
import crypto from 'node:crypto';
import { RNG } from './rng.js';
import { generateMap, reveal, findPath } from './mapgen.js';
import { startCombat, heroAction, availableActions, syncHeroes } from './combat.js';
import { writeSave, listSaves, readSave, readLegends, addLegends } from './save.js';
import { CLASSES } from '../shared/data/classes.js';
import { ITEMS, AFFIXES, RARITY } from '../shared/data/items.js';
import { TALENTS, TRAITS, TRANSFORMS, LOOK, BONDS } from '../shared/data/heroes.js';
import { EVENTS, CAMP_SCENES, SOLO_SCENES } from '../shared/data/events.js';
import { STORY_EVENTS, STORY, CHAPTERS, computeEnding } from '../shared/data/story.js';
import { MYTHIC, BIOMES, ACTS, FACTIONS } from '../shared/data/mythic.js';
import { heroDerived, checkBonus, xpToNext, MAX_LEVEL, MAX_HEROES, SLOTS, hkey, STAT_NAMES, itemPrice, JOURNEY, hexDist } from '../shared/rules.js';

const STEP_TABLE = [0, 1, 1, 1, 2, 2, 2, 3];
const PLAYER_COLORS = ['#ffb547', '#7fd4ff', '#b58bff', '#7dff9a', '#ff7a8a', '#e8e0c8'];
const allEvents = (id) => EVENTS[id] || STORY_EVENTS[id];

export class Game {
  constructor(onChange) {
    this.onChange = onChange;
    this.players = {}; // id -> {id, name, token, color, isHost, connected}
    this.timers = new Set();
    this.rng = new RNG(crypto.randomInt(1, 2 ** 31));
    this.s = this.lobbyState();
    this.pending = false;
  }

  lobbyState() {
    return { phase: 'lobby', heroes: [], log: [], seq: 0, version: 1 };
  }

  // ---------------- utilità ----------------
  changed() {
    if (this.pending) return;
    this.pending = true;
    setImmediate(() => { this.pending = false; this.onChange(); });
  }
  timer(fn, ms) {
    const t = setTimeout(() => { this.timers.delete(t); try { fn(); } catch (e) { console.error(e); } }, ms);
    this.timers.add(t);
  }
  clearTimers() { for (const t of this.timers) clearTimeout(t); this.timers.clear(); }
  log(text, kind = 'info') {
    this.s.log.push({ id: ++this.s.seq, t: text, k: kind, day: this.s.day || 0 });
    if (this.s.log.length > 120) this.s.log.splice(0, this.s.log.length - 120);
  }
  chron(text) { (this.s.chronicle ||= []).push({ act: this.s.act, text }); }
  host() { return Object.values(this.players).find((p) => p.isHost); }
  connected() { return Object.values(this.players).filter((p) => p.connected); }
  hero(id) { return this.s.heroes.find((h) => h.id === id); }
  aliveHeroes() { return this.s.heroes.filter((h) => h.alive); }
  canControl(player, hero) {
    if (!hero || !player) return false;
    if (hero.owner === player.id) return true;
    const owner = this.players[hero.owner];
    return player.isHost && (!owner || !owner.connected);
  }
  heroName(h) { return h ? h.name : 'qualcuno'; }

  // ---------------- giocatori ----------------
  addPlayer({ name, token, isHost }) {
    let p = Object.values(this.players).find((x) => x.token === token);
    if (p) { p.connected = true; if (name) p.name = name; if (isHost) p.isHost = true; return p; }
    if (isHost) for (const x of Object.values(this.players)) x.isHost = false;
    const id = 'P' + crypto.randomBytes(3).toString('hex');
    const used = Object.values(this.players).map((x) => x.color);
    p = { id, name: (name || 'Viandante').slice(0, 20), token: token || crypto.randomBytes(8).toString('hex'), color: PLAYER_COLORS.find((c) => !used.includes(c)) || '#fff', isHost: !!isHost, connected: true };
    this.players[id] = p;
    // riassegna eroi caricati da un salvataggio al giocatore con lo stesso nome
    for (const h of this.s.heroes) if (h.ownerName === p.name && (!this.players[h.owner]?.connected || this.players[h.owner]?.name !== h.ownerName)) h.owner = p.id;
    this.log(`${p.name} si unisce alla compagnia.`, 'sys');
    this.changed();
    return p;
  }
  disconnect(pid) {
    const p = this.players[pid];
    if (!p) return;
    p.connected = false;
    this.log(`${p.name} si è disconnesso.`, 'sys');
    this.tryResolveVote();
    this.changed();
  }

  // ---------------- oggetti ----------------
  makeItem(base, rarity = 'comune', affixes = []) {
    const it = { uid: crypto.randomBytes(4).toString('hex'), base, rarity, affixes };
    it.name = this.composeName(it);
    return it;
  }
  composeName(it) {
    const d = ITEMS[it.base];
    const pre = it.affixes.map((a) => AFFIXES[a]).filter((a) => a.prefix).map((a) => a.name);
    const suf = it.affixes.map((a) => AFFIXES[a]).filter((a) => !a.prefix).map((a) => a.name);
    return [d.name, ...pre].join(' ') + (suf.length ? ' ' + suf.join(' ') : '');
  }
  itemLabel(it) { return it.name || ITEMS[it.base].name; }
  randomLoot(q = 'any') {
    const act = this.s.act || 1;
    const tierMax = Math.min(4, act + (q === 'epic' ? 1 : 0));
    const tierMin = Math.max(1, act - 1);
    if (q === 'any' && this.rng.chance(0.35)) return this.makeItem(this.rng.pick(['pozione', 'pozione', 'etere', 'sali', 'bomba_cenere', 'olio_lume']));
    const pool = Object.entries(ITEMS).filter(([, d]) => d.slot !== 'use' && d.tier >= tierMin && d.tier <= tierMax).map(([id]) => id);
    const rarity = q === 'epic' ? this.rng.weighted([['raro', 30], ['epico', 50], ['mitico', 20]])
      : q === 'rare' ? this.rng.weighted([['raro', 60], ['epico', 32], ['mitico', 8]])
        : this.rng.weighted([['comune', 55], ['raro', 30], ['epico', 12], ['mitico', 3]]);
    const nA = RARITY[rarity].affixes;
    const affs = this.rng.shuffle(Object.keys(AFFIXES)).slice(0, nA);
    return this.makeItem(this.rng.pick(pool), rarity, affs);
  }
  shopStock(kind) {
    const out = ['pozione', 'pozione', 'etere', 'sali', 'olio_lume'].map((b) => this.makeItem(b));
    if (this.s.act >= 2) out.push(this.makeItem('pozione_grande'), this.makeItem('brace_vitale'), this.makeItem('bomba_cenere'));
    else out.push(this.makeItem('brace_vitale'));
    const n = kind === 'ombra' || kind === 'sale' ? 4 : 6;
    for (let i = 0; i < n; i++) out.push(this.randomLoot(kind === 'ombra' ? 'rare' : 'shop'));
    return out;
  }

  // ---------------- XP e livelli ----------------
  grantXp(xp) {
    const ups = [];
    for (const h of this.s.heroes) {
      if (h.level >= MAX_LEVEL) continue;
      h.xp += h.alive ? xp : Math.round(xp / 2);
      while (h.level < MAX_LEVEL && h.xp >= xpToNext(h.level)) {
        h.xp -= xpToNext(h.level);
        this.levelUp(h);
        ups.push(`${h.name} → Lv ${h.level}`);
      }
    }
    return ups;
  }
  levelUp(h) {
    h.level++;
    const cls = CLASSES[h.cls];
    const d = heroDerived(h, this.s);
    if (h.alive) { h.hp = Math.min(d.maxHp, h.hp + cls.hpG * 2); h.mp = Math.min(d.maxMp, h.mp + cls.mpG * 2); }
    const opts = this.rng.shuffle(Object.keys(TALENTS).filter((t) => !h.talents.includes(t))).slice(0, 3);
    h.pendingTalents.push(opts);
    if (h.level >= 3 && !h.sub) h.pendingSub = true;
    this.log(`✦ ${h.name} sale al livello ${h.level}!`, 'good');
  }

  // ---------------- creazione eroi (lobby) ----------------
  newHero(owner, { name, cls, skin, hair, legend }) {
    if (!CLASSES[cls]) throw 'Classe sconosciuta';
    const id = 'H' + crypto.randomBytes(3).toString('hex');
    const traits = this.rng.shuffle(Object.keys(TRAITS)).slice(0, 2);
    const h = {
      id, owner: owner.id, ownerName: owner.name, name: (name || 'Senza Nome').slice(0, 18), cls, sub: null, job: null,
      level: 1, xp: 0, hp: 1, mp: 1, alive: true, bonusStats: {}, equip: {}, talents: [], traits, transforms: [], bonds: {},
      age: this.rng.int(19, 34), look: { skin: LOOK.skin.includes(skin) ? skin : LOOK.skin[0], hair: LOOK.hair.includes(hair) ? hair : LOOK.hair[0] },
      pendingTalents: [], pendingSub: false, row: CLASSES[cls].row, legend: false, kills: 0,
    };
    if (legend) {
      const L = readLegends().find((x) => x.id === legend);
      if (L) {
        Object.assign(h, { name: L.name, cls: L.cls, traits: L.traits, transforms: L.transforms || [], look: L.look, age: L.age + 20, legend: true, title: L.title });
      }
    }
    for (const b of CLASSES[h.cls].start) {
      const it = this.makeItem(b);
      const slot = ITEMS[b].slot === 'acc' ? (h.equip.acc1 ? 'acc2' : 'acc1') : ITEMS[b].slot;
      h.equip[slot] = it;
    }
    const d = heroDerived(h, null);
    h.hp = d.maxHp; h.mp = d.maxMp;
    return h;
  }

  // ---------------- campagna ----------------
  newCampaign() {
    const s = this.s;
    const seed = crypto.randomInt(1, 2 ** 31);
    this.rng = new RNG(seed);
    Object.assign(s, {
      phase: 'map', seed, act: 1, day: 1, threat: 5, fate: 3, fateMax: 5, gold: 60, rations: 8,
      bag: [], flags: {}, rep: { lantern: 0, moth: 0, salt: 0, eclipse: 0 }, moral: { fiamma: 0, falena: 0, sale: 0 },
      mythic: null, crystals: 0, chronicle: [], event: null, combat: null, town: null, camp: null, chapter: null, vote: null, ending: null,
      rollSeq: 0, campaignName: `Viandanti ${new Date().toLocaleDateString('it-IT')}`,
    });
    for (const b of ['pozione', 'pozione', 'pozione', 'etere', 'olio_lume']) s.bag.push(this.makeItem(b));
    for (const h of s.heroes) { const d = heroDerived(h, s); h.hp = d.maxHp; h.mp = d.maxMp; h.alive = true; }
    this.log('La campagna ha inizio. ' + ACTS[1].name, 'title');
    this.setupAct(1);
  }

  setupAct(act) {
    const s = this.s;
    s.act = act;
    s.map = generateMap(this.rng, act);
    s.party = { ...s.map.start };
    reveal(s.map, s.party.q, s.party.r, 3);
    s.map.tiles[hkey(s.party.q, s.party.r)].vis = true;
    s.travel = { stage: 'roll', pool: [], rollId: 0, steps: 0, vedetta: 0 };
    for (const h of s.heroes) { const d = heroDerived(h, s); h.alive = true; h.hp = d.maxHp; h.mp = d.maxMp; }
    this.startEvent(STORY[act].intro, null);
  }

  // ---------------- dispatcher ----------------
  handle(player, a) {
    const s = this.s;
    if (!a || typeof a.type !== 'string') throw 'Azione non valida';
    const hostOnly = () => { if (!player.isHost) throw 'Solo l\'host può farlo'; };
    switch (a.type) {
      // ---- lobby ----
      case 'create_hero': {
        if (s.phase !== 'lobby') throw 'La partita è già iniziata';
        if (s.heroes.length >= MAX_HEROES) throw 'Il gruppo è al completo (4 eroi)';
        if (a.legend && s.heroes.some((h) => h.legendId === a.legend)) throw 'Leggenda già nel gruppo';
        const h = this.newHero(player, a);
        if (a.legend) h.legendId = a.legend;
        s.heroes.push(h);
        this.log(`${player.name} crea ${h.name}, ${CLASSES[h.cls].name}.`, 'sys');
        break;
      }
      case 'delete_hero': {
        if (s.phase !== 'lobby') throw 'Solo nella lobby';
        const h = this.hero(a.heroId);
        if (!h || (h.owner !== player.id && !player.isHost)) throw 'Non puoi';
        s.heroes = s.heroes.filter((x) => x !== h);
        break;
      }
      case 'reroll_traits': {
        if (s.phase !== 'lobby') throw 'Solo nella lobby';
        const h = this.hero(a.heroId);
        if (!h || h.owner !== player.id) throw 'Non puoi';
        if (h.legend) throw 'Le leggende non cambiano';
        h.traits = this.rng.shuffle(Object.keys(TRAITS)).slice(0, 2);
        const d = heroDerived(h, null); h.hp = d.maxHp; h.mp = d.maxMp;
        break;
      }
      case 'assign_hero': {
        hostOnly();
        const h = this.hero(a.heroId), p = this.players[a.playerId];
        if (!h || !p) throw 'Dati non validi';
        h.owner = p.id; h.ownerName = p.name;
        this.log(`${h.name} ora è guidato da ${p.name}.`, 'sys');
        break;
      }
      case 'debug_combat': {
        // solo per sviluppo: avviare il server con VAEL_DEBUG=1
        hostOnly();
        if (!process.env.VAEL_DEBUG || s.phase !== 'map') throw 'Non disponibile';
        s.afterCombat = 'map';
        startCombat(this, a.boss ? [a.boss] : 'random', a.boss ? { boss: true } : {});
        break;
      }
      case 'start': {
        hostOnly();
        if (s.phase !== 'lobby') throw 'Già iniziata';
        if (!s.heroes.length) throw 'Crea almeno un eroe';
        this.newCampaign();
        break;
      }
      case 'save': {
        hostOnly();
        if (s.phase === 'lobby') throw 'Niente da salvare';
        this.save(a.name || s.campaignName);
        break;
      }
      case 'load': {
        hostOnly();
        this.load(a.file);
        break;
      }
      case 'to_lobby': {
        hostOnly();
        this.clearTimers();
        const heroes = s.phase === 'gameover' || s.phase === 'ending' ? [] : [];
        this.s = this.lobbyState();
        this.s.heroes = heroes;
        this.log('Ritorno alla lobby.', 'sys');
        break;
      }
      // ---- gestione eroi ----
      case 'equip': this.equip(player, a); break;
      case 'unequip': this.unequip(player, a); break;
      case 'use_item': this.useItem(player, a); break;
      case 'discard': {
        if (s.phase === 'combat') throw 'Non in battaglia';
        s.bag = s.bag.filter((i) => i.uid !== a.uid); break;
      }
      case 'choose_talent': {
        const h = this.ownHero(player, a.heroId);
        const opts = h.pendingTalents[0];
        if (!opts || !opts.includes(a.talent)) throw 'Talento non disponibile';
        h.talents.push(a.talent); h.pendingTalents.shift();
        this.log(`${h.name} apprende il talento ${TALENTS[a.talent].name}.`, 'good');
        break;
      }
      case 'choose_sub': {
        const h = this.ownHero(player, a.heroId);
        if (h.level < 3 || h.sub) throw 'Non disponibile';
        const sub = CLASSES[h.cls].subclasses.find((x) => x.id === a.sub);
        if (!sub) throw 'Sottoclasse sconosciuta';
        h.sub = sub.id; h.pendingSub = false;
        this.log(`${h.name} intraprende la via: ${sub.name}.`, 'good');
        break;
      }
      case 'choose_job': {
        const h = this.ownHero(player, a.heroId);
        if (!s.crystals) throw 'Serve un Cristallo risvegliato';
        if (!CLASSES[a.job] || a.job === h.cls) throw 'Mestiere non valido';
        if (s.phase === 'combat') throw 'Non in battaglia';
        h.job = a.job;
        this.log(`${h.name} apprende il mestiere secondario: ${CLASSES[a.job].name}.`, 'good');
        break;
      }
      case 'set_row': {
        const h = this.ownHero(player, a.heroId);
        if (s.phase === 'combat') throw 'Usa il comando in battaglia';
        h.row = a.row ? 1 : 0; break;
      }
      // ---- viaggio ----
      case 'travel_roll': this.travelRoll(); break;
      case 'travel_assign': this.travelAssign(player, a); break;
      case 'travel_confirm': this.travelConfirm(player); break;
      case 'move': this.move(a); break;
      case 'end_day': this.endDay(); break;
      // ---- eventi e voti ----
      case 'vote': this.vote(player, a.idx); break;
      case 'force_vote': hostOnly(); this.resolveVote(true); break;
      case 'roll_check': this.rollCheck(player, a.heroId); break;
      case 'reroll': this.reroll(); break;
      case 'accept_roll': this.acceptRoll(); break;
      case 'event_continue': this.eventContinue(); break;
      // ---- città ----
      case 'town': this.townService(player, a); break;
      case 'buy': this.buy(a.uid); break;
      case 'sell': this.sell(a.uid); break;
      case 'leave_town': if (s.phase !== 'town') throw 'Non sei in città'; s.town = null; s.phase = 'map'; break;
      case 'camp_continue': if (s.phase !== 'camp' || !s.camp?.result) throw 'Non ancora'; s.camp = null; s.phase = 'map'; break;
      // ---- combattimento ----
      case 'combat': heroAction(this, player, a); break;
      case 'combat_continue': this.combatContinue(); break;
      // ---- capitoli ----
      case 'chapter_continue': this.chapterContinue(); break;
      default: throw 'Azione sconosciuta: ' + a.type;
    }
    if (s.phase !== 'lobby' && s.phase !== 'gameover' && s.phase !== 'ending' && s.threat >= 100) this.gameOver('La Cenere Marea ha sommerso Vael.');
    this.changed();
  }

  ownHero(player, id) {
    const h = this.hero(id);
    if (!this.canControl(player, h)) throw 'Non controlli questo eroe';
    return h;
  }

  // ---------------- inventario ----------------
  equip(player, { heroId, uid }) {
    const s = this.s;
    if (s.phase === 'combat') throw 'Non durante la battaglia';
    const h = this.ownHero(player, heroId);
    const idx = s.bag.findIndex((i) => i.uid === uid);
    if (idx < 0) throw 'Oggetto non trovato';
    const it = s.bag[idx], d = ITEMS[it.base];
    if (d.slot === 'use') throw 'Non è equipaggiabile';
    let slot = d.slot;
    if (slot === 'acc') slot = !h.equip.acc1 ? 'acc1' : !h.equip.acc2 ? 'acc2' : 'acc1';
    s.bag.splice(idx, 1);
    if (h.equip[slot]) s.bag.push(h.equip[slot]);
    h.equip[slot] = it;
    this.clampHero(h);
  }
  unequip(player, { heroId, slot }) {
    const s = this.s;
    if (s.phase === 'combat') throw 'Non durante la battaglia';
    const h = this.ownHero(player, heroId);
    if (!SLOTS.includes(slot) || !h.equip[slot]) throw 'Slot vuoto';
    s.bag.push(h.equip[slot]); delete h.equip[slot];
    this.clampHero(h);
  }
  clampHero(h) { const d = heroDerived(h, this.s); h.hp = Math.min(h.hp, d.maxHp); h.mp = Math.min(h.mp, d.maxMp); }
  useItem(player, { heroId, uid }) {
    const s = this.s;
    if (s.phase === 'combat') throw 'Usa gli oggetti dal menu di battaglia';
    const idx = s.bag.findIndex((i) => i.uid === uid);
    if (idx < 0) throw 'Oggetto non trovato';
    const it = s.bag[idx], d = ITEMS[it.base];
    if (!d.use) throw 'Non utilizzabile';
    if (d.use.bomb) throw 'Si usa in battaglia';
    if (d.use.threat) {
      s.threat = Math.max(0, s.threat + d.use.threat);
      this.log(`L'Olio di Lume brucia nella notte: Cenere Marea ${d.use.threat}.`, 'good');
    } else {
      const h = this.hero(heroId);
      if (!h) throw 'Eroe non valido';
      const dd = heroDerived(h, s);
      if (d.use.revive) { if (h.alive) throw 'È già in vita'; h.alive = true; h.hp = Math.round(dd.maxHp * d.use.revive); }
      else {
        if (!h.alive) throw 'Eroe caduto';
        if (d.use.heal) h.hp = Math.min(dd.maxHp, h.hp + d.use.heal);
        if (d.use.mp) h.mp = Math.min(dd.maxMp, h.mp + d.use.mp);
      }
      this.log(`${h.name} usa ${d.name}.`, 'info');
    }
    s.bag.splice(idx, 1);
  }

  // ---------------- viaggio a giornate ----------------
  requireTravel(stage) {
    if (this.s.phase !== 'map') throw 'Non sei sulla mappa';
    if (stage && this.s.travel.stage !== stage) throw 'Non è il momento';
  }
  travelRoll() {
    this.requireTravel('roll');
    const t = this.s.travel;
    t.pool = this.aliveHeroes().map((h) => ({ heroId: h.id, v: this.rng.d(6), face: CLASSES[h.cls].journey, assign: null }));
    t.rollId++;
    t.stage = 'assign';
    this.log(`Giorno ${this.s.day}: la Riserva del Cammino dà ${t.pool.map((p) => p.v).join(' · ')}.`, 'info');
  }
  travelAssign(player, { heroId, face }) {
    this.requireTravel('assign');
    if (!JOURNEY[face]) throw 'Uso non valido';
    const die = this.s.travel.pool.find((p) => p.heroId === heroId);
    if (!die) throw 'Dado non trovato';
    if (!this.canControl(player, this.hero(heroId))) throw 'Il dado appartiene a un altro giocatore';
    die.assign = face;
  }
  travelConfirm(player) {
    this.requireTravel('assign');
    const s = this.s, t = s.travel;
    if (t.pool.some((p) => !p.assign)) {
      if (!player.isHost) throw 'Tutti i dadi devono essere assegnati';
      for (const p of t.pool) if (!p.assign) p.assign = 'passi';
    }
    let steps = 1, ved = 0, wide = false;
    const tile = s.map.tiles[hkey(s.party.q, s.party.r)];
    const notes = [];
    for (const p of t.pool) {
      const v = Math.min(7, p.v + (p.assign === p.face ? 1 : 0));
      const h = this.hero(p.heroId);
      if (p.assign === 'passi') steps += STEP_TABLE[v];
      if (p.assign === 'foraggio') { const r = v >= 5 ? 3 : v >= 3 ? 2 : 1; s.rations += r; notes.push(`${h.name} raccoglie ${r} razioni`); }
      if (p.assign === 'vedetta') { ved += v; if (v >= 5) wide = true; }
      if (p.assign === 'ricerca') {
        if (tile.searched) notes.push(`${h.name} non trova altro qui`);
        else if (v >= 5) { const it = this.randomLoot('any'); s.bag.push(it); notes.push(`${h.name} trova: ${this.itemLabel(it)}`); tile.searched = true; }
        else if (v >= 3) { const g = this.rng.int(6, 15) * s.act; s.gold += g; notes.push(`${h.name} trova ${g} oro`); tile.searched = true; }
        else notes.push(`${h.name} non trova nulla`);
      }
    }
    t.steps = steps; t.vedetta = ved; t.wide = wide; t.stage = 'move';
    if (wide) reveal(s.map, s.party.q, s.party.r, 3);
    this.log(`Passi: ${steps}. ${notes.join('. ')}`, 'info');
  }
  move({ q, r }) {
    this.requireTravel('move');
    const s = this.s, t = s.travel;
    if (t.steps <= 0) throw 'Nessun passo rimasto: termina la giornata';
    const path = findPath(s.map, s.party, { q, r }, t.steps);
    if (!path || !path.length) throw 'Destinazione irraggiungibile';
    for (const step of path) {
      s.party = { q: step.q, r: step.r };
      t.steps--;
      const tile = s.map.tiles[hkey(step.q, step.r)];
      tile.vis = true;
      reveal(s.map, step.q, step.r, t.wide ? 3 : 2);
      if (tile.poi && !tile.poi.done) {
        if (this.triggerPoi(tile)) return;
      }
      // incontri casuali (stile JRPG)
      const bd = BIOMES[tile.b];
      if (bd.danger && !tile.poi) {
        const p = Math.max(2, ((bd.danger + s.threat / 5 + (tile.cor ? 12 : 0)) * 0.3 - t.vedetta * 1.2)) / 100;
        if (this.rng.chance(p)) {
          this.log('Un\'imboscata lungo il cammino!', 'bad');
          s.afterCombat = 'map';
          startCombat(this, 'random');
          return;
        }
      }
    }
  }
  endDay() {
    this.requireTravel();
    const s = this.s;
    if (s.travel.stage === 'roll') throw 'Prima tira la Riserva del Cammino';
    // razioni
    const alive = this.aliveHeroes();
    let starving = 0;
    for (const h of alive) {
      if (s.rations > 0) s.rations--;
      else { starving++; const d = heroDerived(h, s); h.hp = Math.max(1, h.hp - Math.round(d.maxHp * 0.15)); }
      const d = heroDerived(h, s);
      h.mp = Math.min(d.maxMp, h.mp + Math.round(d.maxMp * 0.1));
    }
    if (starving) this.log(`${starving} eroi patiscono la fame (−15% PV).`, 'bad');
    // minaccia
    const inc = ACTS[s.act].threatRate + Math.floor(s.day / 12);
    s.threat = Math.min(100, s.threat + inc);
    this.spreadCorruption();
    s.day++;
    this.log(`Cala la notte. La Cenere Marea avanza (+${inc}%).`, 'threat');
    s.travel = { stage: 'roll', pool: [], rollId: s.travel.rollId, steps: 0, vedetta: s.travel.vedetta || 0 };
    if (s.threat >= 100) return;
    if (s.day % 5 === 0) this.autosave();
    // agguato notturno
    const tile = s.map.tiles[hkey(s.party.q, s.party.r)];
    const bd = BIOMES[tile.b];
    const pAmb = Math.max(0, (bd.danger + s.threat / 4 + (tile.cor ? 10 : 0)) * 0.6 - (s.travel.vedetta || 0) * 2) / 100;
    s.travel.vedetta = 0;
    if (!tile.poi && bd.danger && this.rng.chance(pAmb)) {
      this.log('Agguato nella notte!', 'bad');
      s.afterCombat = 'map';
      startCombat(this, 'random', { ambush: true });
    }
  }
  spreadCorruption() {
    const s = this.s;
    const tiles = Object.values(s.map.tiles).filter((t) => !BIOMES[t.b].blocked);
    const target = Math.floor(tiles.length * 0.55 * s.threat / 100);
    let cur = tiles.filter((t) => t.cor).length;
    const beacons = tiles.filter((t) => t.poi?.t === 'beacon' && t.poi.lit);
    const safe = (t) => beacons.some((b) => hexDist(b, t) <= 2) || (t.poi && ['town', 'boss'].includes(t.poi.t)) || (t.q === s.party.q && t.r === s.party.r);
    let guard = 0;
    while (cur < target && guard++ < 200) {
      const front = tiles.filter((t) => !t.cor && !safe(t) && (tiles.some((o) => o.cor && hexDist(o, t) === 1) || t.x >= s.map.w - 2));
      if (!front.length) break;
      // la cenere arriva da est
      const pick = this.rng.weighted(front.map((t) => [t, 1 + t.x / 4]));
      pick.cor = true; cur++;
    }
    s.map.v++;
  }

  // ---------------- punti d'interesse ----------------
  triggerPoi(tile) {
    const s = this.s, poi = tile.poi;
    switch (poi.t) {
      case 'town': case 'merchant': this.enterTown(tile); return true;
      case 'camp':
        if (poi.usedDay === s.day) return false;
        poi.usedDay = s.day; this.enterCamp(tile); return true;
      case 'beacon': if (poi.lit) return false; this.startEvent('faro', tile); return true;
      case 'crystal': this.startEvent('cristallo', tile); return true;
      case 'shrine': this.startEvent('santuario', tile); return true;
      case 'den': this.startEvent('covo', tile); return true;
      case 'event': this.startEvent(poi.id, tile); return true;
      case 'story': this.startEvent(poi.id, tile); return true;
      case 'boss': {
        const missing = STORY[s.act].nodes.filter((n) => !Object.values(s.map.tiles).find((t) => t.poi?.id === n.id)?.poi.done);
        if (missing.length) {
          this.log(`${poi.name}: un sigillo di cenere vi respinge. Completate prima la storia di questo atto (★).`, 'bad');
          return false;
        }
        this.startEvent(STORY[s.act].boss(s.flags), tile);
        return true;
      }
    }
    return false;
  }

  // ---------------- eventi ----------------
  startEvent(id, tile) {
    const s = this.s, ev = allEvents(id);
    if (!ev) throw 'Evento sconosciuto ' + id;
    const subject = this.rng.pick(this.aliveHeroes()) || s.heroes[0];
    s.event = {
      id, title: ev.title, art: ev.art, story: !!ev.story, tile: tile ? hkey(tile.q, tile.r) : null,
      subject: subject?.id, text: this.fmt(ev.text, subject), stage: 'choose', roll: null, result: null, chosen: null,
      opts: ev.opts.map((o) => ({ text: this.fmt(o.text, subject), check: o.check || null, locked: this.reqFail(o.req) })),
    };
    s.phase = 'event';
    s.vote = { kind: 'event', n: ev.opts.length, votes: {} };
    this.log(`📜 ${ev.title}`, 'event');
    this.tryResolveVote();
  }
  fmt(text, hero) { return String(text).replaceAll('{eroe}', hero ? hero.name : 'qualcuno'); }
  reqFail(req) {
    if (!req) return null;
    const s = this.s;
    if (req.rations && s.rations < req.rations) return `Servono ${req.rations} razioni`;
    if (req.gold && s.gold < req.gold) return `Servono ${req.gold} oro`;
    if (req.item && !s.bag.some((i) => i.base === req.item)) return `Serve: ${ITEMS[req.item].name}`;
    if (req.flag && !s.flags[req.flag]) return 'Non avete i mezzi per farlo';
    if (req.rep && (s.rep[req.rep[0]] || 0) < req.rep[1]) return `Reputazione insufficiente: ${FACTIONS[req.rep[0]].name}`;
    return null;
  }
  vote(player, idx) {
    const s = this.s, v = s.vote;
    if (!v) throw 'Nessuna votazione in corso';
    if (!Number.isInteger(idx) || idx < 0 || idx >= v.n) throw 'Scelta non valida';
    if (v.kind === 'event' && s.event.opts[idx].locked) throw s.event.opts[idx].locked;
    if (v.kind === 'mythic' && !s.mythicOpts[idx].ok) throw 'Sentiero non disponibile';
    v.votes[player.id] = idx;
    this.tryResolveVote();
  }
  tryResolveVote() {
    const v = this.s.vote;
    if (!v) return;
    const voters = this.connected();
    if (voters.length && voters.every((p) => p.id in v.votes)) this.resolveVote(false);
  }
  resolveVote(force) {
    const s = this.s, v = s.vote;
    if (!v) throw 'Nessuna votazione';
    const counts = new Array(v.n).fill(0);
    for (const i of Object.values(v.votes)) counts[i]++;
    let best = Math.max(...counts);
    if (best === 0) {
      if (!force) return;
      // nessun voto: prima opzione disponibile
      const first = v.kind === 'event' ? s.event.opts.findIndex((o) => !o.locked) : v.kind === 'mythic' ? s.mythicOpts.findIndex((o) => o.ok) : 0;
      counts[Math.max(0, first)] = 1; best = 1;
    }
    const tied = counts.map((c, i) => [c, i]).filter(([c]) => c === best).map(([, i]) => i);
    const hostVote = v.votes[this.host()?.id];
    const choice = tied.includes(hostVote) ? hostVote : tied[0];
    s.vote = null;
    if (v.kind === 'event') this.chooseOption(choice);
    else if (v.kind === 'mythic') this.chooseMythic(choice);
    else if (v.kind === 'camp') this.resolveCamp(choice);
  }
  chooseOption(idx) {
    const s = this.s, e = s.event, def = allEvents(e.id).opts[idx];
    e.chosen = idx;
    this.log(`Il gruppo sceglie: «${e.opts[idx].text}»`, 'event');
    if (def.check) {
      e.stage = 'roll';
      e.check = { stat: def.check.stat, dc: def.check.dc };
    } else {
      const subject = this.hero(e.subject);
      this.finishOption(def.res, def.fx || [], subject, null);
    }
  }
  rollCheck(player, heroId) {
    const s = this.s, e = s.event;
    if (s.phase !== 'event' || e.stage !== 'roll') throw 'Nessuna prova in corso';
    const h = this.hero(heroId);
    if (!h || !h.alive) throw 'Eroe non valido';
    if (!this.canControl(player, h)) throw 'Solo il giocatore che controlla questo eroe può tirare';
    this.doRoll(h);
  }
  doRoll(h) {
    const s = this.s, e = s.event;
    const nat = this.rng.d(20);
    const bonus = checkBonus(h, e.check.stat, s);
    const total = nat + bonus;
    const success = nat === 20 || (nat !== 1 && total >= e.check.dc);
    e.roll = { heroId: h.id, name: h.name, nat, bonus, total, dc: e.check.dc, stat: e.check.stat, success, id: ++s.rollSeq, rerolls: (e.roll?.rerolls || 0) };
    e.stage = 'rolled';
    this.log(`🎲 ${h.name} tira ${STAT_NAMES[e.check.stat]}: ${nat} ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} = ${total} contro CD ${e.check.dc} — ${success ? 'SUCCESSO' : 'FALLIMENTO'}${nat === 20 ? ' (critico!)' : nat === 1 ? ' (disastro!)' : ''}`, success ? 'good' : 'bad');
  }
  reroll() {
    const s = this.s, e = s.event;
    if (s.phase !== 'event' || e.stage !== 'rolled' || e.roll.success) throw 'Niente da ritirare';
    if (s.fate < 1) throw 'Nessuna Scintilla del Fato';
    s.fate--;
    const h = this.hero(e.roll.heroId);
    const rr = e.roll.rerolls + 1;
    this.log(`✨ Una Scintilla del Fato brucia: ${h.name} ritira il dado!`, 'fate');
    this.doRoll(h);
    e.roll.rerolls = rr;
  }
  acceptRoll() {
    const s = this.s, e = s.event;
    if (s.phase !== 'event' || e.stage !== 'rolled') throw 'Nessun tiro da accettare';
    const def = allEvents(e.id).opts[e.chosen];
    const h = this.hero(e.roll.heroId);
    const out = e.roll.success ? def.ok : def.ko;
    this.finishOption(out.text, out.fx || [], h, e.roll.success);
  }
  finishOption(text, fx, hero, success) {
    const s = this.s, e = s.event;
    const res = this.applyFx(fx, hero);
    e.stage = 'result';
    e.result = { text: this.fmt(text || '', hero), success, gains: res.gains };
    e.pending = res;
  }
  eventContinue() {
    const s = this.s, e = s.event;
    if (s.phase !== 'event' || e.stage !== 'result') throw 'Non ancora';
    const p = e.pending || {};
    const tile = e.tile ? s.map.tiles[e.tile] : null;
    if (tile?.poi && !p.keep && !p.boss) {
      tile.poi.done = true;
      if (tile.poi.t === 'story') {
        const left = STORY[s.act].nodes.filter((n) => !Object.values(s.map.tiles).find((t) => t.poi?.id === n.id)?.poi.done);
        if (!left.length) { reveal(s.map, s.map.boss.q, s.map.boss.r, 1); this.log(`★ La via per ${s.map.tiles[hkey(s.map.boss.q, s.map.boss.r)].poi.name} è aperta.`, 'title'); }
      }
    }
    s.event = null;
    s.phase = 'map';
    if (p.boss) { s.afterCombat = 'map'; startCombat(this, [p.boss], { boss: true, onWin: [['endact']] }); return; }
    if (p.combat) { s.afterCombat = 'map'; startCombat(this, p.combat); return; }
    if (p.shop) { this.enterTown(null, p.shop); return; }
    if (p.endact) { this.endAct(); return; }
  }

  applyFx(fx, roller) {
    const s = this.s, rng = this.rng;
    const out = { gains: [] };
    const who = (w) => {
      const alive = this.aliveHeroes();
      if (w === 'all') return alive;
      if (w === 'random') return [rng.pick(alive)].filter(Boolean);
      if (w === 'weakest') return [...alive].sort((a, b) => a.hp - b.hp).slice(0, 1);
      return [roller && roller.alive ? roller : rng.pick(alive)].filter(Boolean);
    };
    const actMul = 1 + 0.6 * (s.act - 1);
    for (const [type, v, w, x] of fx) {
      switch (type) {
        case 'gold': { const g = v > 0 ? Math.round(v * actMul * (s.mythic === 'sale' ? 1.25 : 1)) : v; s.gold = Math.max(0, s.gold + g); out.gains.push(`${g > 0 ? '+' : ''}${g} oro`); break; }
        case 'hp': case 'mp': {
          for (const h of who(w || (v < 0 ? 'roller' : 'all'))) {
            const d = heroDerived(h, s);
            const max = type === 'hp' ? d.maxHp : d.maxMp;
            const delta = Math.round(max * v / 100);
            if (type === 'hp') h.hp = Math.max(1, Math.min(max, h.hp + delta)); else h.mp = Math.max(0, Math.min(max, h.mp + delta));
            out.gains.push(`${h.name} ${delta >= 0 ? '+' : ''}${delta} ${type === 'hp' ? 'PV' : 'PM'}`);
          }
          break;
        }
        case 'item': {
          const it = v === 'random' ? this.randomLoot('any') : v === 'rare' ? this.randomLoot('rare') : this.makeItem(v);
          s.bag.push(it); out.gains.push(`Ottenuto: ${this.itemLabel(it)}`); break;
        }
        case 'useitem': { const i = s.bag.findIndex((it) => it.base === v); if (i >= 0) { s.bag.splice(i, 1); out.gains.push(`Usato: ${ITEMS[v].name}`); } break; }
        case 'fate': { const f = Math.max(0, Math.min(s.fateMax, s.fate + v)); out.gains.push(`${v > 0 ? '+' : ''}${v} Scintille del Fato`); s.fate = f; break; }
        case 'threat': s.threat = Math.max(0, Math.min(100, s.threat + v)); out.gains.push(`Cenere Marea ${v > 0 ? '+' : ''}${v}%`); break;
        case 'rations': s.rations = Math.max(0, s.rations + v); out.gains.push(`${v > 0 ? '+' : ''}${v} razioni`); break;
        case 'xp': { const ups = this.grantXp(Math.round(v * actMul)); out.gains.push(`+${Math.round(v * actMul)} XP al gruppo`, ...ups); break; }
        case 'flag': s.flags[v] = true; break;
        case 'rep': s.rep[v] = (s.rep[v] || 0) + w; out.gains.push(`${FACTIONS[v].name} ${w > 0 ? '+' : ''}${w}`); break;
        case 'moral': s.moral[v] = (s.moral[v] || 0) + w; out.gains.push(`${MYTHIC[v].icon} ${MYTHIC[v].name.replace(/^Sentiero (della |del )?/, '')} ${w > 0 ? '+' : ''}${w}`); break;
        case 'combat': out.combat = v; break;
        case 'boss': out.boss = v; break;
        case 'shop': out.shop = v; break;
        case 'keep': out.keep = true; break;
        case 'endact': out.endact = true; break;
        case 'transform': {
          for (const h of who(w)) {
            if (h.transforms.includes(v)) { this.grantXp(20); continue; }
            h.transforms.push(v); this.clampHero(h);
            out.gains.push(`${h.name}: ${TRANSFORMS[v].name}!`);
            this.chron(`${h.name} fu segnato: ${TRANSFORMS[v].name}.`);
          }
          break;
        }
        case 'trait': for (const h of who(w)) if (!h.traits.includes(v)) { h.traits.push(v); out.gains.push(`${h.name} diventa ${TRAITS[v].name}`); } break;
        case 'stat': for (const h of who(x)) { h.bonusStats[v] = (h.bonusStats[v] || 0) + w; out.gains.push(`${h.name} ${STAT_NAMES[v]} ${w > 0 ? '+' : ''}${w}`); this.clampHero(h); } break;
        case 'reveal': reveal(s.map, s.party.q, s.party.r, v); out.gains.push('La mappa si rivela'); break;
        case 'crystal': s.crystals++; out.gains.push('Cristallo risvegliato: mestieri secondari disponibili (scheda eroe)'); this.chron('Risvegliarono un Cristallo Spento.'); break;
        case 'beacon': {
          const t = s.event?.tile ? s.map.tiles[s.event.tile] : null;
          if (t?.poi) t.poi.lit = true;
          s.threat = Math.max(0, s.threat - 12);
          for (const o of Object.values(s.map.tiles)) if (t && hexDist(o, t) <= 3) o.cor = false;
          s.map.v++;
          out.gains.push('Faro acceso! Cenere Marea −12%');
          this.chron('Riaccesero un faro.');
          break;
        }
        case 'bond': {
          const a = this.aliveHeroes();
          if (a.length >= 2) {
            const [h1, h2] = rng.shuffle(a);
            if (!h1.bonds[h2.id]) { h1.bonds[h2.id] = h2.bonds[h1.id] = 'amici'; out.gains.push(`${h1.name} e ${h2.name} diventano amici`); }
          }
          break;
        }
        case 'allies': {
          for (const [f, flag] of [['lantern', 'ally_lantern'], ['salt', 'ally_salt'], ['moth', 'ally_moth']]) {
            if ((s.rep[f] || 0) >= 3 || (f === 'moth' && s.flags.a2_pact)) { s.flags[flag] = true; out.gains.push(`${FACTIONS[f].icon} ${FACTIONS[f].name} si unisce all'assalto`); }
          }
          if (!out.gains.length) out.gains.push('Nessuna fazione risponde. Siete soli.');
          break;
        }
        case 'chron': this.chron(v); break;
      }
    }
    for (const g of out.gains) this.log('  · ' + g, 'gain');
    return out;
  }

  // ---------------- città ----------------
  enterTown(tile, shopKind) {
    const s = this.s;
    const poi = tile?.poi;
    let services, name;
    if (shopKind) { services = ['bottega']; name = shopKind === 'ombra' ? 'Banco del Mercante d\'Ombra' : 'Zattera dei Contrabbandieri'; }
    else if (poi.t === 'merchant') { services = ['bottega', 'voci']; name = poi.name; }
    else { services = ['locanda', 'cappella', 'bottega', 'fabbro', 'voci']; name = poi.name; }
    if (poi && (!poi.stock || poi.stockAct !== s.act || poi.stockDay < s.day - 6)) { poi.stock = this.shopStock(poi.t); poi.stockAct = s.act; poi.stockDay = s.day; }
    s.town = { name, services, tile: tile ? hkey(tile.q, tile.r) : null, stock: poi ? null : this.shopStock(shopKind), rumors: false };
    s.phase = 'town';
    this.log(`🏘 ${name}`, 'event');
  }
  stock() { const t = this.s.town; return t.tile ? this.s.map.tiles[t.tile].poi.stock : t.stock; }
  townService(player, a) {
    const s = this.s, t = s.town;
    if (s.phase !== 'town') throw 'Non sei in città';
    if (!t.services.includes(a.svc) && a.svc !== 'razioni') throw 'Servizio non disponibile';
    const pay = (n) => { if (s.gold < n) throw `Servono ${n} oro`; s.gold -= n; };
    switch (a.svc) {
      case 'locanda': {
        pay(8 * s.act);
        for (const h of this.aliveHeroes()) { const d = heroDerived(h, s); h.hp = d.maxHp; h.mp = d.maxMp; }
        this.log('Una notte alla locanda: il gruppo è ristorato. (Salvataggio automatico)', 'good');
        this.autosave();
        break;
      }
      case 'cappella': {
        const h = this.hero(a.heroId);
        if (!h || h.alive) throw 'Nessun eroe caduto selezionato';
        pay(25 * s.act);
        h.alive = true; h.hp = Math.round(heroDerived(h, s).maxHp * 0.5);
        this.log(`Le campane suonano: ${h.name} torna tra i vivi.`, 'good');
        break;
      }
      case 'fabbro': {
        const h = this.ownHero(player, a.heroId);
        const it = h.equip[a.slot];
        if (!it) throw 'Slot vuoto';
        if (it.affixes.length >= 3) throw 'Già al massimo';
        const cost = 30 * s.act * (it.affixes.length + 1);
        pay(cost);
        const opts = Object.keys(AFFIXES).filter((x) => !it.affixes.includes(x));
        it.affixes.push(this.rng.pick(opts));
        it.rarity = ['comune', 'raro', 'epico', 'mitico'][it.affixes.length];
        it.name = this.composeName(it);
        this.clampHero(h);
        this.log(`Il fabbro tempra ${it.name} per ${h.name}.`, 'good');
        break;
      }
      case 'voci': {
        if (t.rumors) throw 'Avete già ascoltato le voci';
        pay(5);
        t.rumors = true;
        reveal(s.map, s.party.q, s.party.r, 6);
        this.log('In taverna si parla di strade, fari e mostri: la mappa si rivela.', 'info');
        break;
      }
      case 'razioni': pay(10); s.rations += 4; this.log('Comprate 4 razioni.', 'info'); break;
    }
  }
  buy(uid) {
    const s = this.s;
    if (s.phase !== 'town') throw 'Non sei in città';
    const st = this.stock();
    const i = st.findIndex((x) => x.uid === uid);
    if (i < 0) throw 'Oggetto esaurito';
    const price = itemPrice(st[i]);
    if (s.gold < price) throw 'Oro insufficiente';
    s.gold -= price;
    s.bag.push(st.splice(i, 1)[0]);
  }
  sell(uid) {
    const s = this.s;
    if (s.phase !== 'town') throw 'Non sei in città';
    const i = s.bag.findIndex((x) => x.uid === uid);
    if (i < 0) throw 'Oggetto non trovato';
    s.gold += Math.max(1, Math.round(itemPrice(s.bag[i]) * 0.4));
    this.stock().push(s.bag.splice(i, 1)[0]);
  }

  // ---------------- accampamento ----------------
  enterCamp() {
    const s = this.s;
    for (const h of this.aliveHeroes()) {
      const d = heroDerived(h, s);
      h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.4));
      h.mp = Math.min(d.maxMp, h.mp + Math.round(d.maxMp * 0.4));
    }
    const alive = this.aliveHeroes();
    let scene;
    if (alive.length >= 2) {
      const pairs = [];
      for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) pairs.push([alive[i], alive[j]]);
      const fresh = pairs.filter(([a, b]) => !a.bonds[b.id]);
      const [a, b] = this.rng.pick(fresh.length ? fresh : pairs);
      const sc = this.rng.pick(CAMP_SCENES);
      const f = (t) => t.replaceAll('{a}', a.name).replaceAll('{b}', b.name);
      scene = { a: a.id, b: b.id, text: f(sc.text), opts: [f(sc.a), f(sc.b)], hints: ['Legame: amicizia (o amore)', 'Legame: rivalità'] };
    } else if (alive.length === 1) {
      const a = alive[0];
      const sc = this.rng.pick(SOLO_SCENES);
      scene = { a: a.id, solo: SOLO_SCENES.indexOf(sc), text: sc.text.replaceAll('{a}', a.name), opts: [sc.a, sc.b], hints: ['', ''] };
    }
    s.camp = { scene, result: null };
    s.phase = 'camp';
    this.log('🔥 Il gruppo si accampa (+40% PV e PM).', 'good');
    if (scene) { s.vote = { kind: 'camp', n: 2, votes: {} }; this.tryResolveVote(); }
    else s.camp.result = { text: 'Una notte tranquilla.' };
  }
  resolveCamp(idx) {
    const s = this.s, sc = s.camp.scene;
    const a = this.hero(sc.a), b = sc.b && this.hero(sc.b);
    let text;
    if (sc.solo != null) {
      const def = SOLO_SCENES[sc.solo];
      const r = this.applyFx(idx === 0 ? def.fa : def.fb, a);
      text = r.gains.join(', ');
    } else if (a.bonds[b.id]) {
      this.grantXp(15);
      text = `Il legame tra ${a.name} e ${b.name} (${BONDS[a.bonds[b.id]].name}) si rafforza. +15 XP al gruppo.`;
    } else {
      let type = idx === 0 ? 'amici' : 'rivali';
      if (idx === 0 && (a.traits.includes('romantico') || b.traits.includes('romantico')) && this.rng.chance(0.6)) type = 'amanti';
      a.bonds[b.id] = type; b.bonds[a.id] = type;
      text = `${a.name} e ${b.name} ora sono ${BONDS[type].name.toLowerCase()}! ${BONDS[type].desc}`;
      this.chron(`${a.name} e ${b.name} divennero ${BONDS[type].name.toLowerCase()}.`);
      this.log(`${BONDS[type].icon} ${text}`, 'good');
    }
    s.camp.result = { text, choice: idx };
  }

  // ---------------- combattimento: uscita ----------------
  combatContinue() {
    const s = this.s, c = s.combat;
    if (s.phase !== 'combat' || !c || c.phase === 'fight') throw 'La battaglia non è finita';
    this.clearTimers();
    if (c.phase === 'fled') syncHeroes(this);
    if (c.phase === 'defeat') { s.combat = null; return this.defeat(); }
    s.combat = null;
    s.phase = 'map';
    for (const h of s.heroes) this.clampHero(h);
    if (c.phase === 'victory' && c.onWin) {
      const r = this.applyFx(c.onWin, null);
      if (r.endact) return this.endAct();
    }
  }
  defeat() {
    const s = this.s;
    if (s.fate >= 2) {
      s.fate -= 2;
      s.gold = Math.floor(s.gold / 2);
      s.threat = Math.min(100, s.threat + 10);
      for (const h of s.heroes) { const d = heroDerived(h, s); h.alive = true; h.hp = Math.round(d.maxHp * 0.3); }
      s.party = { ...s.map.start };
      s.travel = { stage: 'roll', pool: [], rollId: s.travel?.rollId || 0, steps: 0, vedetta: 0 };
      s.phase = 'map';
      this.log('✨ L\'Ultima Scintilla: il Fato vi strappa alla morte. Vi risvegliate al villaggio, feriti e impoveriti (−2 Scintille, −50% oro, +10% Cenere).', 'fate');
      this.chron('Caddero, ma il Fato li riportò indietro.');
    } else this.gameOver('Il gruppo è caduto e nessuna Scintilla del Fato può salvarlo.');
  }
  gameOver(reason) {
    const s = this.s;
    this.clearTimers();
    s.phase = 'gameover';
    s.gameover = { reason };
    this.log('☠ ' + reason, 'bad');
  }

  // ---------------- atti, intermezzi, finali ----------------
  endAct() {
    const s = this.s;
    s.crystals++;
    if (s.act >= 3) {
      s.phase = 'ending';
      s.ending = computeEnding(s);
      s.ending.chronicle = s.chronicle;
      s.ending.heroes = s.heroes.map((h) => ({ name: h.name, cls: h.cls, alive: h.alive, age: h.age, level: h.level }));
      this.log(`🌅 FINE: ${s.ending.title}`, 'title');
      addLegends(s.heroes.filter((h) => h.alive).map((h) => ({ id: h.id, name: h.name, cls: h.cls, traits: h.traits, transforms: h.transforms, look: h.look, age: h.age, title: s.ending.title })));
      this.autosave();
      return;
    }
    const ch = CHAPTERS[s.act];
    const gains = [];
    for (const h of s.heroes) {
      h.age += ch.years;
      const st = this.rng.pick(['str', 'vit', 'int', 'spi', 'dex', 'agi', 'luk']);
      h.bonusStats[st] = (h.bonusStats[st] || 0) + 1;
      if (h.level < MAX_LEVEL) { h.xp = 0; this.levelUp(h); }
      gains.push(`${h.name} (${h.age} anni): +1 ${STAT_NAMES[st]}, livello ${h.level}`);
    }
    s.phase = 'chapter';
    s.chapter = { act: s.act, title: ch.title, text: ch.text, years: ch.years, chronicle: (s.chronicle || []).filter((c) => c.act === s.act).map((c) => c.text), gains };
    this.autosave();
  }
  chapterContinue() {
    const s = this.s;
    if (s.phase !== 'chapter') throw 'Non ora';
    if (s.act === 1) {
      const top = Math.max(...Object.values(s.moral));
      s.mythicOpts = Object.keys(MYTHIC).map((id) => ({ id, score: s.moral[id] || 0, ok: (s.moral[id] || 0) >= 3 || (s.moral[id] || 0) === top }));
      s.phase = 'mythic';
      s.vote = { kind: 'mythic', n: 3, votes: {} };
      this.log('Le vostre scelte hanno aperto dei Sentieri Mitici. Votate quale percorrere.', 'title');
      return;
    }
    this.nextAct();
  }
  chooseMythic(idx) {
    const s = this.s;
    const id = s.mythicOpts[idx].id;
    s.mythic = id;
    s.fateMax += MYTHIC[id].fateMax || 0;
    s.fate = s.fateMax;
    this.chron(`Scelsero il ${MYTHIC[id].name}.`);
    this.log(`${MYTHIC[id].icon} Il gruppo intraprende il ${MYTHIC[id].name}!`, 'title');
    this.nextAct();
  }
  nextAct() {
    const s = this.s;
    s.chapter = null;
    s.threat = Math.max(10, Math.round(s.threat * 0.5));
    s.fate = Math.min(s.fateMax, s.fate + 2);
    this.log(ACTS[s.act + 1].name, 'title');
    this.setupAct(s.act + 1);
  }

  // ---------------- salvataggi ----------------
  meta() {
    const s = this.s;
    return { act: s.act, day: s.day, heroes: s.heroes.map((h) => `${h.name} (${CLASSES[h.cls].name} ${h.level})`).join(', '), phase: s.phase };
  }
  serialize() { return { ...this.s, combat: null, rng: this.rng.s, phase: this.s.phase === 'combat' ? 'map' : this.s.phase }; }
  save(name) {
    const st = this.serialize();
    if (this.s.phase === 'combat') { st.afterCombat = null; }
    const file = writeSave(name, st, this.meta());
    this.s.campaignName = name;
    this.log(`💾 Partita salvata: ${file}`, 'sys');
    return file;
  }
  autosave() { try { writeSave('autosalvataggio', this.serialize(), this.meta()); } catch (e) { console.error('autosave', e); } }
  load(file) {
    const data = readSave(file);
    this.clearTimers();
    const st = data.state;
    this.rng = new RNG(st.rng || 1);
    delete st.rng;
    st.log = st.log || [];
    this.s = st;
    const host = this.host();
    for (const h of st.heroes) {
      const p = Object.values(this.players).find((x) => x.name === h.ownerName && x.connected);
      h.owner = p ? p.id : host.id;
    }
    if (st.vote) this.tryResolveVote();
    this.log(`📂 Caricata la partita «${data.meta?.name || file}».`, 'sys');
  }
  listSaves() { return listSaves(); }
  legends() { return readLegends(); }

  // ---------------- vista per i client ----------------
  view() {
    const s = this.s;
    const v = { ...s };
    if (s.combat && s.combat.phase === 'fight') {
      const u = s.combat.units.find((x) => x.id === s.combat.active);
      v.combat = { ...s.combat, avail: u && u.side === 'hero' ? availableActions(this, u) : null };
    }
    return v;
  }
}
