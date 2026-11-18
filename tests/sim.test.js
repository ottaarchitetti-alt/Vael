// Simulazioni headless: verificano che l'intera campagna sia giocabile dall'inizio al finale senza errori
import test from 'node:test';
import assert from 'node:assert';
import { Game } from '../server/game.js';
import { RNG } from '../server/rng.js';
import { findPath } from '../server/mapgen.js';
import { STORY } from '../shared/data/story.js';
import { TUTORIAL_STORY } from '../shared/data/tutorial.js';
import { heroDerived, successChance, checkBonus, hkey, hexDist } from '../shared/rules.js';
import { BIOMES } from '../shared/data/mythic.js';

// con un seme fisso la partita è ripetibile: stessi dadi, stessa mappa, stesso esito
function makeGame(seed) {
  const g = new Game(() => {});
  if (seed != null) { g.fixedSeed = seed; g.rng = new RNG(seed); }
  const q = [];
  g.timer = (fn) => q.push(fn);
  g.flush = () => { let n = 0; while (q.length && n++ < 80) q.shift()(); };
  return g;
}

// sceglie la prossima destinazione della storia
function target(s) {
  const tiles = Object.values(s.map.tiles);
  const st = s.tutorial ? TUTORIAL_STORY : STORY[s.act];
  const node = st.nodes.map((n) => tiles.find((t) => t.poi?.id === n.id)).find((t) => t && !t.poi.done);
  return node || s.map.boss;
}
function revealAll(s) { for (const t of Object.values(s.map.tiles)) t.rev = true; }

function bot(g, p, maxSteps = 20000) {
  const errors = [];
  for (let i = 0; i < maxSteps; i++) {
    const s = g.s;
    try {
      if (s.phase === 'event') {
        const e = s.event;
        if (e.stage === 'choose') g.handle(p, { type: 'vote', idx: Math.max(0, e.opts.findIndex((o) => !o.locked)) });
        else if (e.stage === 'roll') {
          const best = s.heroes.filter((h) => h.alive && (!e.present || e.present.includes(h.id))).sort((a, b) => checkBonus(b, e.check.stat, s) - checkBonus(a, e.check.stat, s))[0];
          g.handle(p, { type: 'roll_check', heroId: best.id });
        } else if (e.stage === 'rolled') g.handle(p, { type: !e.roll.success && s.fate > 2 ? 'reroll' : 'accept_roll' });
        else g.handle(p, { type: 'event_continue' });
      } else if (s.phase === 'map') {
        const t = s.travel;
        revealAll(s);
        const h = g.activeHero();
        if (t.stage === 'roll') g.handle(p, { type: 'travel_roll' });
        else if (t.stage === 'assign') {
          g.handle(p, { type: 'travel_assign', face: t.cur === 0 && s.rations < 6 ? 'foraggio' : 'passi' });
          g.handle(p, { type: 'travel_confirm' });
        } else if (t.steps > 0) {
          const goal = target(s);
          const full = findPath(s.map, h.pos, goal, 200);
          if (!full) throw new Error("nessun percorso verso l'obiettivo");
          // il gruppo resta unito: nessuno va più di 2 caselle avanti al più lento
          const behind = Math.max(...g.aliveHeroes().map((x) => (findPath(s.map, x.pos, goal, 200) || []).length));
          const allowed = full.length >= behind ? Math.min(t.steps, full.length) : Math.min(t.steps, full.length - Math.max(0, behind - 2));
          if (allowed <= 0) { g.handle(p, { type: 'end_turn' }); continue; }
          const step = full[allowed - 1];
          g.handle(p, { type: 'move', q: step.q, r: step.r });
        } else g.handle(p, { type: 'end_turn' });
      } else if (s.phase === 'town') {
        if (s.town.services.includes('locanda') && s.gold > 40) { try { g.handle(p, { type: 'town', svc: 'locanda' }); } catch {} }
        for (const h of s.heroes.filter((x) => !x.alive)) { try { g.handle(p, { type: 'town', svc: 'cappella', heroId: h.id }); } catch {} }
        if (s.rations < 8) { try { g.handle(p, { type: 'town', svc: 'razioni' }); } catch {} }
        g.handle(p, { type: 'leave_town' });
      } else if (s.phase === 'camp') { if (s.vote) g.handle(p, { type: 'vote', idx: 0 }); else g.handle(p, { type: 'camp_continue' }); }
      else if (s.phase === 'combat') {
        const c = s.combat;
        if (c.phase !== 'fight') { g.handle(p, { type: 'combat_continue' }); continue; }
        const u = c.units.find((x) => x.id === c.active);
        if (u && u.side === 'hero' && !u.acted) {
          const foes = c.units.filter((x) => x.side === 'enemy' && x.alive);
          const front = foes.filter((x) => x.row === 0);
          const tgt = (u.ranged ? foes : front.length ? front : foes)[0];
          const sk = u.skills.find((k) => ['fendente', 'scheggia', 'freccia', 'luce_sacra', 'pugnalata', 'lamento'].includes(k));
          try { g.handle(p, { type: 'combat', kind: sk && u.mp >= 4 ? 'skill' : 'attack', skill: sk, target: tgt.id }); }
          catch { g.handle(p, { type: 'combat', kind: 'attack', target: (front.length ? front : foes)[0].id }); }
        }
        g.flush();
      } else if (s.phase === 'chapter') g.handle(p, { type: 'chapter_continue' });
      else if (s.phase === 'mythic') g.handle(p, { type: 'vote', idx: s.mythicOpts.findIndex((o) => o.ok) });
      else break;
      // scelte di livello
      for (const h of s.heroes) {
        if (h.pendingSub) g.handle(p, { type: 'choose_sub', heroId: h.id, sub: 'ferro' === h.sub ? 'x' : (h.cls === 'lama' ? 'ferro' : h.cls === 'custode' ? 'pietoso' : h.cls === 'arcanista' ? 'prisma' : h.cls === 'cacciatrice' ? 'tiratrice' : h.cls === 'ombra' ? 'notte' : 'rogo') });
        if (h.pendingTalents.length) g.handle(p, { type: 'choose_talent', heroId: h.id, talent: h.pendingTalents[0][0] });
      }
    } catch (e) {
      if (typeof e !== 'string') throw e;
      errors.push(e);
      if (errors.length > 200) throw new Error('troppi errori: ' + errors.slice(-5).join(' | '));
    }
  }
  return errors;
}

test('rng deterministico', () => {
  const a = new RNG(42), b = new RNG(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('formule delle prove', () => {
  assert.equal(successChance(0, 11), 0.5);
  assert.ok(successChance(5, 10) > successChance(0, 10));
  assert.equal(successChance(30, 10), 0.95);
});

test('mappe: il boss è sempre raggiungibile', () => {
  for (let seed = 1; seed < 40; seed++) {
    for (const act of [1, 2, 3]) {
      const g = makeGame();
      g.rng = new RNG(seed);
      g.s.act = act;
      const { generateMap } = g.constructor.__mapgen || {};
      void generateMap;
    }
  }
  const g = makeGame();
  const p = g.addPlayer({ name: 'T', token: 't', isHost: true });
  g.handle(p, { type: 'create_hero', name: 'A', cls: 'lama' });
  for (let i = 0; i < 25; i++) {
    g.handle(p, { type: 'to_lobby' });
    g.handle(p, { type: 'create_hero', name: 'A', cls: 'lama' });
    g.handle(p, { type: 'start' });
    for (const act of [1, 2, 3]) {
      if (act > 1) g.setupAct(act);
      const s = g.s;
      for (const t of Object.values(s.map.tiles)) t.rev = true;
      assert.ok(findPath(s.map, s.map.start, s.map.boss, 500), `boss irraggiungibile (atto ${act})`);
      for (const n of STORY[act].nodes) assert.ok(Object.values(s.map.tiles).some((t) => t.poi?.id === n.id), `nodo ${n.id} mancante`);
      assert.ok(!BIOMES[s.map.tiles[hkey(s.map.start.q, s.map.start.r)].b].blocked);
    }
  }
});

const CAMPAIGN_SEEDS = [1, 2, 3];
test('campagna completa fino al finale (party forte)', () => {
  let endings = 0;
  // semi fissi: il test gioca sempre le stesse partite. SIMSEEDS=1,2,3 permette di provarne altre.
  const seeds = process.env.SIMSEEDS ? process.env.SIMSEEDS.split(',').map(Number) : CAMPAIGN_SEEDS;
  for (const [run, seed] of seeds.entries()) {
    const g = makeGame(seed);
    const p = g.addPlayer({ name: 'Tester', token: 't' + run, isHost: true });
    for (const cls of ['lama', 'custode', 'arcanista', 'cacciatrice']) g.handle(p, { type: 'create_hero', name: cls, cls });
    g.handle(p, { type: 'start' });
    for (const h of g.s.heroes) { h.bonusStats = { str: 12, vit: 14, int: 12, spi: 12, dex: 12, agi: 6 }; const d = heroDerived(h, g.s); h.hp = d.maxHp; h.mp = d.maxMp; }
    g.s.rations = 40; g.s.gold = 500;
    bot(g, p);
    const s = g.s;
    if (process.env.SIMLOG) console.log(`run ${run} (seme ${seeds[run]}): fase ${s.phase}, atto ${s.act}, giorno ${s.day}, minaccia ${s.threat}`, s.ending?.title || s.gameover?.reason || '');
    assert.ok(['ending', 'gameover'].includes(s.phase), `la partita non è terminata: ${s.phase} atto ${s.act}`);
    if (s.phase === 'ending') {
      endings++;
      assert.ok(s.ending.title && s.ending.text);
      assert.ok(s.mythic);
    }
    // round-trip di salvataggio
    const ser = JSON.parse(JSON.stringify(g.serialize()));
    assert.equal(ser.act, s.act);
    assert.equal(ser.heroes.length, 4);
  }
  assert.ok(endings >= 1, 'nessuna simulazione ha raggiunto un finale');
});

test('viaggio: un eroe alla volta in ordine di velocità, ognuno con la sua pedina', () => {
  const g = makeGame();
  const p = g.addPlayer({ name: 'T', token: 'd', isHost: true });
  for (const cls of ['lama', 'arcanista', 'ombra']) g.handle(p, { type: 'create_hero', name: cls, cls });
  g.handle(p, { type: 'start' });
  while (g.s.phase === 'event') {
    const e = g.s.event;
    if (e.stage === 'choose') g.handle(p, { type: 'vote', idx: 0 });
    else if (e.stage === 'roll') g.handle(p, { type: 'roll_check', heroId: g.s.heroes[0].id });
    else if (e.stage === 'rolled') g.handle(p, { type: 'accept_roll' });
    else g.handle(p, { type: 'event_continue' });
  }
  const t = g.s.travel;
  const spd = (id) => heroDerived(g.hero(id), g.s).spd;
  for (let i = 1; i < t.order.length; i++) assert.ok(spd(t.order[i - 1]) >= spd(t.order[i]), 'ordine non per velocità');
  const first = g.activeHero();
  g.handle(p, { type: 'travel_roll' });
  assert.equal(t.die.heroId, first.id);
  g.handle(p, { type: 'travel_assign', face: t.die.face });
  assert.equal(t.die.assign, t.die.face);
  g.handle(p, { type: 'travel_assign', face: t.die.face }); // riselezionare toglie la scelta e il +1
  assert.equal(t.die.assign, null);
  assert.throws(() => g.handle(p, { type: 'travel_confirm' }), /Scegli/);
  g.handle(p, { type: 'travel_assign', face: 'passi' });
  g.handle(p, { type: 'travel_confirm' });
  assert.ok(t.steps >= 2);
  const start = { ...first.pos };
  const dest = Object.values(g.s.map.tiles).find((x) => x.rev && !x.poi && hexDist(x, start) === 1 && findPath(g.s.map, start, x, 1));
  g.handle(p, { type: 'move', q: dest.q, r: dest.r });
  assert.deepEqual(first.pos, { q: dest.q, r: dest.r });
  const other = g.s.heroes.find((h) => h !== first);
  assert.deepEqual(other.pos, start, 'gli altri eroi non si devono muovere');
  if (g.s.phase === 'map') {
    g.handle(p, { type: 'end_turn' });
    assert.notEqual(g.activeHero().id, first.id);
    const day = g.s.day;
    while (g.s.phase === 'map' && g.s.day === day) g.handle(p, { type: 'end_turn' });
    if (g.s.phase === 'map') assert.equal(g.s.travel.cur, 0);
  }
});

test('modalità locale e aspetto personalizzato', () => {
  const g = makeGame();
  const p = g.addPlayer({ name: 'T', token: 'm', isHost: true });
  g.handle(p, { type: 'set_mode', mode: 'local' });
  assert.equal(g.s.mode, 'local');
  g.handle(p, { type: 'create_hero', name: 'A', cls: 'ombra', look: { hairStyle: 'treccia', beard: 'pizzetto', acc: 'benda', skin: '#nonvalido' } });
  const h = g.s.heroes[0];
  assert.equal(h.look.hairStyle, 'treccia');
  assert.equal(h.look.acc, 'benda');
  assert.notEqual(h.look.skin, '#nonvalido');
  assert.throws(() => g.handle(p, { type: 'set_mode', mode: 'boh' }));
});

test('tutorial completo fino alla fine', () => {
  const g = makeGame();
  const p = g.addPlayer({ name: 'Allievo', token: 'tut', isHost: true });
  g.handle(p, { type: 'start_tutorial' });
  assert.equal(g.s.tutorial, true);
  assert.equal(g.s.heroes.length, 3);
  bot(g, p, 4000);
  assert.equal(g.s.phase, 'ending', `il tutorial non è finito: ${g.s.phase}`);
  assert.equal(g.s.ending.tutorial, true);
  assert.ok(g.s.flags.tut_rig, 'il primo tiro truccato non è avvenuto');
});

test('mosse d\'arma: schianto ad area, raffica e tiro a distanza', async () => {
  const { startCombat } = await import('../server/combat.js');
  const g = makeGame();
  const p = g.addPlayer({ name: 'T', token: 'w', isHost: true });
  g.handle(p, { type: 'create_hero', name: 'Bruto', cls: 'lama' });
  g.handle(p, { type: 'start' });
  g.s.event = null; g.s.vote = null; g.s.phase = 'map';
  startCombat(g, ['lupo_bruma', 'lupo_bruma', 'lupo_bruma']);
  const c = g.s.combat;
  const hero = c.units.find((u) => u.side === 'hero');
  for (const e of c.units.filter((u) => u.side === 'enemy')) { e.row = 0; e.eva = 0; e.hp = e.maxHp = 999; }
  c.active = hero.id; hero.acted = false;
  hero.wtype = 'mazza';
  const t = c.units.find((u) => u.side === 'enemy');
  g.handle(p, { type: 'combat', kind: 'attack', move: 'w_schianto', target: t.id });
  assert.equal(c.last.name, 'Schianto');
  assert.equal(new Set(c.last.results.filter((r) => r.dmg).map((r) => r.id)).size, 3, 'lo schianto deve colpire tutta la fila');
  assert.equal(c.last.ranged, false);
  hero.acted = false; c.active = hero.id; hero.wtype = 'arco';
  g.handle(p, { type: 'combat', kind: 'attack', move: 'w_tiro', target: t.id });
  assert.equal(c.last.ranged, true, 'l\'arco deve colpire a distanza');
  hero.acted = false; c.active = hero.id;
  g.handle(p, { type: 'combat', kind: 'attack', move: 'w_raffica' });
  assert.equal(c.last.results.length, 3);
});
