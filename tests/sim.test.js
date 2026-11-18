// Simulazioni headless: verificano che l'intera campagna sia giocabile dall'inizio al finale senza errori
import test from 'node:test';
import assert from 'node:assert';
import { Game } from '../server/game.js';
import { RNG } from '../server/rng.js';
import { findPath } from '../server/mapgen.js';
import { STORY } from '../shared/data/story.js';
import { heroDerived, successChance, checkBonus, hkey } from '../shared/rules.js';
import { BIOMES } from '../shared/data/mythic.js';

function makeGame() {
  const g = new Game(() => {});
  const q = [];
  g.timer = (fn) => q.push(fn);
  g.flush = () => { let n = 0; while (q.length && n++ < 80) q.shift()(); };
  return g;
}

// sceglie la prossima destinazione della storia
function target(s) {
  const tiles = Object.values(s.map.tiles);
  const node = STORY[s.act].nodes.map((n) => tiles.find((t) => t.poi?.id === n.id)).find((t) => t && !t.poi.done);
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
          const best = s.heroes.filter((h) => h.alive).sort((a, b) => checkBonus(b, e.check.stat, s) - checkBonus(a, e.check.stat, s))[0];
          g.handle(p, { type: 'roll_check', heroId: best.id });
        } else if (e.stage === 'rolled') g.handle(p, { type: !e.roll.success && s.fate > 2 ? 'reroll' : 'accept_roll' });
        else g.handle(p, { type: 'event_continue' });
      } else if (s.phase === 'map') {
        const t = s.travel;
        revealAll(s);
        if (t.stage === 'roll') g.handle(p, { type: 'travel_roll' });
        else if (t.stage === 'assign') {
          t.pool.forEach((d, k) => g.handle(p, { type: 'travel_assign', heroId: d.heroId, face: k === 0 && s.rations < 6 ? 'foraggio' : 'passi' }));
          g.handle(p, { type: 'travel_confirm' });
        } else if (t.steps > 0) {
          const goal = target(s);
          const full = findPath(s.map, s.party, goal, 200);
          if (!full) throw new Error('nessun percorso verso l\'obiettivo');
          const step = full[Math.min(t.steps, full.length) - 1];
          g.handle(p, { type: 'move', q: step.q, r: step.r });
        } else g.handle(p, { type: 'end_day' });
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

test('campagna completa fino al finale (party forte)', () => {
  let endings = 0;
  for (let run = 0; run < 3; run++) {
    const g = makeGame();
    const p = g.addPlayer({ name: 'Tester', token: 't' + run, isHost: true });
    for (const cls of ['lama', 'custode', 'arcanista', 'cacciatrice']) g.handle(p, { type: 'create_hero', name: cls, cls });
    g.handle(p, { type: 'start' });
    for (const h of g.s.heroes) { h.bonusStats = { str: 12, vit: 14, int: 12, spi: 12, dex: 12, agi: 6 }; const d = heroDerived(h, g.s); h.hp = d.maxHp; h.mp = d.maxMp; }
    g.s.rations = 40; g.s.gold = 500;
    bot(g, p);
    const s = g.s;
    if (process.env.SIMLOG) console.log(`run ${run}: fase ${s.phase}, atto ${s.act}, giorno ${s.day}, minaccia ${s.threat}`, s.ending?.title || s.gameover?.reason || '');
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
