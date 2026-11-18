// Classi, sottoclassi e abilità (dati puri)
export const CLASSES = {
  lama: {
    id: 'lama', name: 'Lama Giurata', icon: '⚔', role: 'Avanguardia',
    desc: 'Guerrieri che hanno giurato su una lama spezzata di proteggere ciò che resta della luce. Reggono la prima fila e spezzano le guardie nemiche.',
    base: { str: 14, vit: 14, int: 7, spi: 9, dex: 10, agi: 9, luk: 9 },
    growth: { str: 1.3, vit: 1.3, int: 0.3, spi: 0.5, dex: 0.7, agi: 0.6, luk: 0.5 },
    hp: 40, hpG: 10, mp: 8, mpG: 2, prof: ['str', 'vit'], journey: 'vedetta', weapon: 'spada', element: 'taglio', row: 0,
    look: { outfit: 'plate', cloak: '#8a2b2b', trim: '#c9a24a' },
    skills: [['fendente', 1], ['provoca', 2], ['spezzaguardia', 4], ['muro', 6], ['lama_ardente', 9]],
    subclasses: [
      { id: 'ferro', name: 'Giuramento di Ferro', desc: 'Scudo vivente: difesa e rigenerazione.', bonus: { vit: 3, defPct: 15 }, skills: [['bastione', 3], ['giudizio', 8]] },
      { id: 'sangue', name: 'Giuramento di Sangue', desc: 'Furia che si nutre delle ferite inferte.', bonus: { str: 3, dmgPct: 10 }, skills: [['furia', 3], ['sete', 8]] },
    ],
    start: ['spada_ruggine', 'scudo_legno', 'giaco_cuoio'],
  },
  ombra: {
    id: 'ombra', name: 'Ombrasca', icon: '🗡', role: 'Lama nell\'ombra',
    desc: 'Ladri e sicari cresciuti nei vicoli senza sole. Colpiscono i nemici marchiati o storditi con precisione letale.',
    base: { str: 10, vit: 9, int: 10, spi: 8, dex: 15, agi: 14, luk: 12 },
    growth: { str: 0.6, vit: 0.6, int: 0.6, spi: 0.4, dex: 1.4, agi: 1.2, luk: 0.9 },
    hp: 30, hpG: 7, mp: 10, mpG: 2, prof: ['dex', 'agi'], journey: 'ricerca', weapon: 'pugnale', element: 'punta', row: 0,
    look: { outfit: 'hood', cloak: '#2d2a3a', trim: '#7b6aa8' },
    skills: [['pugnalata', 1], ['veleno', 2], ['ruba', 3], ['velo', 5], ['doppio', 7]],
    subclasses: [
      { id: 'notte', name: 'Lama della Notte', desc: 'Assassini: esecuzioni e lame d\'ombra.', bonus: { dex: 2, crit: 8 }, skills: [['ombra_lama', 3], ['esecuzione', 8]] },
      { id: 'lesta', name: 'Mano Lesta', desc: 'Truffatori: furti, fumo e trucchi.', bonus: { luk: 3, eva: 6 }, skills: [['borseggio', 3], ['bomba_fumo', 6]] },
    ],
    start: ['pugnale', 'cappuccio', 'giaco_cuoio'],
  },
  arcanista: {
    id: 'arcanista', name: 'Arcanista Vitrea', icon: '✦', role: 'Magia elementale',
    desc: 'Studiosi che piegano la luce attraverso lenti di vetro cantato. Scoprono le debolezze e le colpiscono con fuoco, gelo e fulmine.',
    base: { str: 7, vit: 8, int: 16, spi: 12, dex: 10, agi: 10, luk: 10 },
    growth: { str: 0.3, vit: 0.5, int: 1.5, spi: 1.0, dex: 0.6, agi: 0.7, luk: 0.6 },
    hp: 26, hpG: 6, mp: 18, mpG: 4, prof: ['int', 'spi'], journey: 'passi', weapon: 'bastone', element: 'botta', row: 1,
    look: { outfit: 'robe', cloak: '#2b4f8a', trim: '#8fe3ff', hat: true },
    skills: [['scheggia', 1], ['gelo', 1], ['analizza', 2], ['fulmine', 3], ['nova', 7]],
    subclasses: [
      { id: 'prisma', name: 'Via del Prisma', desc: 'Tempeste elementali su tutti i nemici.', bonus: { int: 3, dmgPct: 8 }, skills: [['rifrazione', 3], ['tempesta', 8]] },
      { id: 'specchio', name: 'Via dello Specchio', desc: 'Barriere e vetro che indebolisce.', bonus: { spi: 2, mdef: 4 }, skills: [['specchio_vitreo', 3], ['barriera', 6]] },
    ],
    start: ['bastone_frassino', 'tomo', 'veste_lino'],
  },
  custode: {
    id: 'custode', name: 'Custode della Lanterna', icon: '✚', role: 'Guaritore',
    desc: 'Sacerdoti che portano una fiamma accesa prima dell\'Eclisse. Curano, benedicono e bruciano ciò che vive nell\'ombra.',
    base: { str: 10, vit: 12, int: 10, spi: 15, dex: 8, agi: 8, luk: 10 },
    growth: { str: 0.6, vit: 1.0, int: 0.6, spi: 1.4, dex: 0.4, agi: 0.5, luk: 0.6 },
    hp: 34, hpG: 8, mp: 16, mpG: 4, prof: ['spi', 'vit'], journey: 'foraggio', weapon: 'lanterna', element: 'luce', row: 1,
    look: { outfit: 'cleric', cloak: '#e8e0c8', trim: '#e0a93a' },
    skills: [['cura', 1], ['luce_sacra', 1], ['benedizione', 3], ['purifica', 4], ['risveglio', 6]],
    subclasses: [
      { id: 'votiva', name: 'Fiamma Votiva', desc: 'La luce come arma contro l\'Eclisse.', bonus: { spi: 2, dmgPct: 10 }, skills: [['giudizio_lume', 3], ['fiamma_votiva', 8]] },
      { id: 'pietoso', name: 'Lume Pietoso', desc: 'Cure di gruppo e scudi di fede.', bonus: { vit: 2, healPct: 20 }, skills: [['cura_corale', 3], ['scudo_fede', 7]] },
    ],
    start: ['lanterna_ottone', 'veste_lino', 'campanella'],
  },
  cantore: {
    id: 'cantore', name: 'Cantore di Cenere', icon: '♪', role: 'Supporto',
    desc: 'Bardi erranti che ricordano le canzoni del tempo del sole. La loro voce rinvigorisce gli alleati e confonde i nemici.',
    base: { str: 9, vit: 10, int: 12, spi: 13, dex: 11, agi: 12, luk: 13 },
    growth: { str: 0.5, vit: 0.7, int: 0.8, spi: 1.1, dex: 0.7, agi: 0.9, luk: 1.0 },
    hp: 30, hpG: 7, mp: 14, mpG: 3, prof: ['spi', 'luk'], journey: 'passi', weapon: 'liuto', element: 'botta', row: 1,
    look: { outfit: 'coat', cloak: '#6b3a6e', trim: '#e3c06b', lute: true },
    skills: [['canto_guerra', 1], ['lamento', 1], ['eco', 3], ['ninna_nanna', 4], ['ballata', 6]],
    subclasses: [
      { id: 'rogo', name: 'Voce del Rogo', desc: 'Inni di fuoco e crescendo travolgenti.', bonus: { int: 2, dmgPct: 8 }, skills: [['inno_rogo', 3], ['crescendo', 6]] },
      { id: 'bruma', name: 'Voce della Bruma', desc: 'Nebbie, requiem e terrore.', bonus: { luk: 2, eva: 5 }, skills: [['nebbia', 3], ['requiem', 7]] },
    ],
    start: ['liuto_vecchio', 'cappuccio', 'giaco_cuoio'],
  },
  cacciatrice: {
    id: 'cacciatrice', name: 'Cacciatrice di Bruma', icon: '➶', role: 'Tiratrice',
    desc: 'Esploratori delle terre nebbiose. Marchiano la preda e colpiscono da qualsiasi fila, ignorando la prima linea nemica.',
    base: { str: 11, vit: 10, int: 9, spi: 10, dex: 15, agi: 13, luk: 11 },
    growth: { str: 0.7, vit: 0.7, int: 0.5, spi: 0.6, dex: 1.4, agi: 1.0, luk: 0.7 },
    hp: 32, hpG: 7, mp: 10, mpG: 2, prof: ['dex', 'int'], journey: 'foraggio', weapon: 'arco', element: 'punta', row: 1,
    look: { outfit: 'ranger', cloak: '#3f5b2e', trim: '#b98b4e', quiver: true },
    skills: [['freccia', 1], ['marchio', 1], ['trappola', 3], ['pioggia', 5], ['freccia_gelo', 7]],
    subclasses: [
      { id: 'falconiera', name: 'Falconiera', desc: 'Un falco di bruma combatte al suo fianco.', bonus: { agi: 2, spd: 2 }, skills: [['falco', 3], ['stormo', 7]] },
      { id: 'tiratrice', name: 'Tiratrice d\'Ombra', desc: 'Colpi singoli, precisi e devastanti.', bonus: { dex: 3, crit: 6 }, skills: [['tiro_preciso', 3], ['colpo_ombra', 8]] },
    ],
    start: ['arco_corto', 'faretra', 'giaco_cuoio'],
  },
};

// kind: phys | mag | heal | buff | debuff | special
// target: enemy | enemies | ally | allies | self | deadAlly
export const SKILLS = {
  attacco: { name: 'Attacco', mp: 0, kind: 'phys', target: 'enemy', power: 1.0, desc: 'Attacco con l\'arma.' },
  // Lama
  fendente: { name: 'Fendente', mp: 3, kind: 'phys', target: 'enemy', power: 1.6, el: 'taglio', desc: 'Un colpo ampio e pesante.' },
  provoca: { name: 'Provoca', mp: 2, kind: 'buff', target: 'self', st: [['taunt', 1, 3], ['protected', 1, 2]], desc: 'Attira gli attacchi nemici e si protegge.' },
  spezzaguardia: { name: 'Spezzaguardia', mp: 4, kind: 'phys', target: 'enemy', power: 1.0, el: 'botta', guard: 2, desc: 'Colpo di pomo: −2 Guardia extra.' },
  muro: { name: 'Muro di Scudi', mp: 7, kind: 'buff', target: 'allies', st: [['protected', 1, 2]], desc: 'Protegge tutto il gruppo.' },
  lama_ardente: { name: 'Lama Ardente', mp: 7, kind: 'phys', target: 'enemy', power: 1.9, el: 'fuoco', st: [['burn', 0.4, 3]], desc: 'La lama si incendia.' },
  bastione: { name: 'Bastione', mp: 5, kind: 'buff', target: 'self', st: [['protected', 1, 3], ['regen', 1, 3], ['taunt', 1, 2]], desc: 'Diventa una fortezza.' },
  giudizio: { name: 'Giudizio di Ferro', mp: 10, kind: 'phys', target: 'enemy', power: 2.6, el: 'botta', guard: 2, desc: 'Schianto che frantuma ogni difesa.' },
  furia: { name: 'Furia', mp: 4, kind: 'buff', target: 'self', st: [['strong', 1, 3], ['haste', 1, 2]], desc: 'Il sangue ribolle.' },
  sete: { name: 'Sete di Sangue', mp: 8, kind: 'phys', target: 'enemy', power: 2.2, el: 'taglio', drain: 0.4, desc: 'Cura il 40% del danno inflitto.' },
  // Ombrasca
  pugnalata: { name: 'Pugnalata', mp: 3, kind: 'phys', target: 'enemy', power: 1.3, el: 'punta', special: 'backstab', desc: '×1.8 contro nemici marchiati, storditi o spezzati.' },
  veleno: { name: 'Lama Avvelenata', mp: 3, kind: 'phys', target: 'enemy', power: 0.8, el: 'punta', st: [['poison', 0.85, 4]], desc: 'Avvelena il bersaglio.' },
  ruba: { name: 'Ruba', mp: 2, kind: 'phys', target: 'enemy', power: 0.5, special: 'steal', desc: 'Sottrae oro o un oggetto.' },
  velo: { name: 'Velo d\'Ombra', mp: 4, kind: 'buff', target: 'self', st: [['shadow', 1, 3]], desc: 'Schivata molto aumentata.' },
  doppio: { name: 'Doppio Taglio', mp: 6, kind: 'phys', target: 'enemy', power: 0.85, el: 'punta', hits: 2, desc: 'Due colpi rapidi.' },
  ombra_lama: { name: 'Lama d\'Ombra', mp: 5, kind: 'phys', target: 'enemy', power: 1.5, el: 'ombra', reach: true, desc: 'Colpisce da lontano attraverso le ombre.' },
  esecuzione: { name: 'Esecuzione', mp: 8, kind: 'phys', target: 'enemy', power: 1.4, el: 'taglio', special: 'execute', desc: '×2.5 contro nemici sotto il 35% dei PV.' },
  borseggio: { name: 'Borseggio', mp: 4, kind: 'phys', target: 'enemy', power: 1.0, special: 'steal', desc: 'Colpisce e ruba con certezza maggiore.' },
  bomba_fumo: { name: 'Bomba di Fumo', mp: 6, kind: 'debuff', target: 'enemies', st: [['blind', 0.7, 3]], desc: 'Acceca i nemici.' },
  // Arcanista
  scheggia: { name: 'Scheggia Ardente', mp: 4, kind: 'mag', target: 'enemy', power: 1.5, el: 'fuoco', st: [['burn', 0.3, 3]], desc: 'Vetro incandescente.' },
  gelo: { name: 'Gelo Cristallino', mp: 4, kind: 'mag', target: 'enemy', power: 1.4, el: 'gelo', st: [['frozen', 0.22, 1]], desc: 'Può congelare.' },
  fulmine: { name: 'Fulmine Prismatico', mp: 5, kind: 'mag', target: 'enemy', power: 1.45, el: 'fulmine', st: [['stun', 0.15, 1]], desc: 'Può stordire. ×2 sui bagnati.' },
  analizza: { name: 'Analizza', mp: 1, kind: 'special', target: 'enemy', special: 'analyze', desc: 'Rivela tutte le debolezze del bersaglio.' },
  nova: { name: 'Nova di Vetro', mp: 9, kind: 'mag', target: 'enemies', power: 0.95, el: 'luce', desc: 'Luce rifratta su tutti i nemici.' },
  rifrazione: { name: 'Rifrazione', mp: 8, kind: 'mag', target: 'enemy', power: 0.75, special: 'prism', hits: 3, desc: '3 raggi di elementi casuali su nemici casuali.' },
  tempesta: { name: 'Tempesta Prismatica', mp: 11, kind: 'mag', target: 'enemies', power: 1.2, el: 'fulmine', desc: 'Fulmini su tutto il campo.' },
  specchio_vitreo: { name: 'Specchio Vitreo', mp: 5, kind: 'mag', target: 'enemy', power: 0.8, el: 'gelo', guard: 2, st: [['weak', 0.9, 3]], desc: 'Indebolisce e incrina la guardia.' },
  barriera: { name: 'Barriera', mp: 7, kind: 'buff', target: 'allies', st: [['ward', 1, 3]], desc: 'Egida magica per il gruppo.' },
  // Custode
  cura: { name: 'Cura', mp: 4, kind: 'heal', target: 'ally', power: 1.6, desc: 'Ripristina PV a un alleato.' },
  luce_sacra: { name: 'Luce Sacra', mp: 4, kind: 'mag', target: 'enemy', power: 1.5, el: 'luce', desc: 'Raggio di luce votiva.' },
  benedizione: { name: 'Benedizione', mp: 5, kind: 'buff', target: 'ally', st: [['regen', 1, 3], ['protected', 1, 1]], desc: 'Rigenerazione e protezione.' },
  purifica: { name: 'Purifica', mp: 3, kind: 'heal', target: 'ally', power: 0.5, special: 'cleanse', desc: 'Rimuove gli stati negativi.' },
  risveglio: { name: 'Risveglio', mp: 12, kind: 'special', target: 'deadAlly', special: 'revive', desc: 'Riporta in vita un alleato caduto.' },
  giudizio_lume: { name: 'Giudizio del Lume', mp: 8, kind: 'mag', target: 'enemies', power: 1.0, el: 'luce', desc: 'Luce su tutti i nemici.' },
  fiamma_votiva: { name: 'Fiamma Votiva', mp: 9, kind: 'mag', target: 'enemy', power: 2.1, el: 'luce', st: [['burn', 0.35, 3]], desc: 'La fiamma più antica di Vael.' },
  cura_corale: { name: 'Cura Corale', mp: 9, kind: 'heal', target: 'allies', power: 1.0, desc: 'Cura tutto il gruppo.' },
  scudo_fede: { name: 'Scudo di Fede', mp: 8, kind: 'buff', target: 'allies', st: [['protected', 1, 2], ['ward', 1, 2]], desc: 'Protezione totale.' },
  // Cantore
  canto_guerra: { name: 'Canto di Guerra', mp: 5, kind: 'buff', target: 'allies', st: [['strong', 1, 3]], desc: 'Il gruppo infligge più danni.' },
  lamento: { name: 'Lamento', mp: 3, kind: 'mag', target: 'enemy', power: 0.6, el: 'ombra', guard: 1, st: [['weak', 0.9, 3]], desc: 'Indebolisce il bersaglio.' },
  eco: { name: 'Eco Veloce', mp: 4, kind: 'buff', target: 'ally', st: [['haste', 1, 3]], special: 'charge1', desc: 'Rapidità e +1 Slancio.' },
  ninna_nanna: { name: 'Ninna Nanna', mp: 5, kind: 'debuff', target: 'enemies', st: [['sleep', 0.4, 2]], desc: 'Può addormentare i nemici.' },
  ballata: { name: 'Ballata del Ritorno', mp: 7, kind: 'heal', target: 'allies', power: 0.7, desc: 'Cura il gruppo.' },
  inno_rogo: { name: 'Inno del Rogo', mp: 8, kind: 'mag', target: 'enemies', power: 1.1, el: 'fuoco', desc: 'Fuoco cantato su tutti i nemici.' },
  crescendo: { name: 'Crescendo', mp: 5, kind: 'buff', target: 'ally', special: 'charge2', desc: '+2 Slancio a un alleato.' },
  nebbia: { name: 'Nebbia', mp: 6, kind: 'debuff', target: 'enemies', st: [['blind', 0.7, 3]], desc: 'Acceca i nemici.' },
  requiem: { name: 'Requiem', mp: 7, kind: 'mag', target: 'enemy', power: 1.6, el: 'ombra', st: [['terror', 0.45, 2]], desc: 'Può terrorizzare.' },
  // Cacciatrice
  freccia: { name: 'Freccia Mirata', mp: 3, kind: 'phys', target: 'enemy', power: 1.5, el: 'punta', reach: true, desc: 'Colpisce qualsiasi fila.' },
  marchio: { name: 'Marchio della Preda', mp: 2, kind: 'phys', target: 'enemy', power: 0.4, reach: true, st: [['marked', 1, 4]], desc: 'Marchia: +25% danni subiti.' },
  trappola: { name: 'Trappola', mp: 4, kind: 'phys', target: 'enemy', power: 0.5, el: 'botta', st: [['stun', 0.6, 1]], desc: 'Può stordire.' },
  pioggia: { name: 'Pioggia di Frecce', mp: 6, kind: 'phys', target: 'enemies', power: 0.8, el: 'punta', reach: true, desc: 'Colpisce tutti i nemici.' },
  freccia_gelo: { name: 'Freccia Gelida', mp: 5, kind: 'phys', target: 'enemy', power: 1.3, el: 'gelo', reach: true, st: [['frozen', 0.3, 1]], desc: 'Può congelare.' },
  falco: { name: 'Falco di Bruma', mp: 4, kind: 'phys', target: 'enemy', power: 0.9, el: 'taglio', hits: 2, reach: true, desc: 'Il falco colpisce due volte.' },
  stormo: { name: 'Stormo', mp: 7, kind: 'phys', target: 'enemies', power: 0.7, el: 'taglio', reach: true, st: [['blind', 0.3, 2]], desc: 'Uno stormo su tutti i nemici.' },
  tiro_preciso: { name: 'Tiro Preciso', mp: 6, kind: 'phys', target: 'enemy', power: 1.5, el: 'punta', reach: true, special: 'sure', desc: 'Sempre critico.' },
  colpo_ombra: { name: 'Colpo d\'Ombra', mp: 8, kind: 'phys', target: 'enemy', power: 2.3, el: 'ombra', reach: true, desc: 'Freccia nera devastante.' },
  // Evocazioni mitiche
  alba: { name: 'Evocazione: Alba', mp: 0, kind: 'mag', target: 'enemies', power: 1.6, el: 'luce', special: 'summon_heal', desc: 'Il sole spezzato si ricompone per un istante: danno di luce e cura al gruppo.' },
  sciame: { name: 'Evocazione: Sciame', mp: 0, kind: 'mag', target: 'enemies', power: 1.5, el: 'ombra', st: [['blind', 0.8, 3]], desc: 'Mille falene oscurano il campo.' },
  marea: { name: 'Evocazione: Marea', mp: 0, kind: 'mag', target: 'enemies', power: 1.5, el: 'gelo', guard: 2, st: [['wet', 1, 3]], desc: 'L\'oceano di sale travolge i nemici.' },
  // Abilità nemiche
  artiglio: { name: 'Artiglio', mp: 0, kind: 'phys', target: 'enemy', power: 1.2, el: 'taglio' },
  morso: { name: 'Morso Venefico', mp: 0, kind: 'phys', target: 'enemy', power: 1.0, el: 'punta', st: [['poison', 0.5, 3]] },
  fiamma_nera: { name: 'Fiamma Nera', mp: 0, kind: 'mag', target: 'enemy', power: 1.3, el: 'ombra' },
  cenere: { name: 'Soffio di Cenere', mp: 0, kind: 'mag', target: 'enemies', power: 0.7, el: 'fuoco', st: [['blind', 0.25, 2]] },
  urlo: { name: 'Urlo Spettrale', mp: 0, kind: 'debuff', target: 'enemies', st: [['terror', 0.35, 2]] },
  polvere: { name: 'Polvere d\'Ala', mp: 0, kind: 'debuff', target: 'enemies', st: [['sleep', 0.3, 1]] },
  cura_oscura: { name: 'Cura Oscura', mp: 0, kind: 'heal', target: 'ally', power: 1.4 },
  scudo_oscuro: { name: 'Scudo Oscuro', mp: 0, kind: 'buff', target: 'allies', st: [['protected', 1, 2]] },
  onda: { name: 'Onda di Palude', mp: 0, kind: 'mag', target: 'enemies', power: 0.8, el: 'gelo', st: [['wet', 0.8, 3]] },
  chela: { name: 'Chela di Sale', mp: 0, kind: 'phys', target: 'enemy', power: 1.4, el: 'botta', st: [['stun', 0.15, 1]] },
  lanterna_cava: { name: 'Lanterna Cava', mp: 0, kind: 'mag', target: 'enemies', power: 1.0, el: 'fuoco', st: [['burn', 0.4, 3]] },
  spegnere: { name: 'Spegnere', mp: 0, kind: 'debuff', target: 'enemy', st: [['silence', 0.8, 2], ['weak', 0.8, 2]] },
  sole_nero: { name: 'Sole Nero', mp: 0, kind: 'mag', target: 'enemies', power: 1.3, el: 'ombra', st: [['terror', 0.3, 2]] },
  rogo_eclisse: { name: 'Rogo dell\'Eclisse', mp: 0, kind: 'mag', target: 'enemy', power: 2.0, el: 'fuoco', st: [['burn', 0.6, 3]] },
  carica: { name: 'Carica Vuota', mp: 0, kind: 'phys', target: 'enemy', power: 1.7, el: 'botta' },
  freccia_nemica: { name: 'Dardo', mp: 0, kind: 'phys', target: 'enemy', power: 1.1, el: 'punta', reach: true },
  evoca: { name: 'Evoca Servitori', mp: 0, kind: 'special', target: 'self', special: 'summon_minions' },
};

// Mosse base di ogni arma (0 PM): sostituiscono l'attacco generico.
// ranged = colpisce a distanza (qualsiasi fila, nessun assalto corpo a corpo); aoe: 'sweep' = bersaglio + vicini
// nella stessa fila (60%), 'row' = tutta la fila del bersaglio, 'volley' = colpi su nemici casuali.
export const WEAPON_MOVES = {
  spada: [
    { id: 'w_fendente', name: 'Fendente', icon: '⚔', kind: 'phys', power: 0.9, aoe: 'sweep', desc: 'Colpo ad arco: ferisce anche i nemici accanto (60%).' },
    { id: 'w_affondo', name: 'Affondo', icon: '🗡', kind: 'phys', power: 1.2, el: 'punta', crit: 10, desc: 'Stoccata precisa: +10% critico.' },
  ],
  pugnale: [
    { id: 'w_rapidi', name: 'Colpi rapidi', icon: '🔪', kind: 'phys', power: 0.6, hits: 2, desc: 'Due fendenti veloci.' },
    { id: 'w_tendini', name: 'Taglio ai tendini', icon: '🩸', kind: 'phys', power: 0.85, st: [['slow', 0.5, 2]], desc: 'Può rallentare il bersaglio.' },
  ],
  mazza: [
    { id: 'w_diretto', name: 'Colpo diretto', icon: '🔨', kind: 'phys', power: 1.15, guard: 1, desc: 'Pesante: −1 Guardia in più.' },
    { id: 'w_schianto', name: 'Schianto', icon: '💥', kind: 'phys', power: 0.65, aoe: 'row', desc: 'Colpisce il terreno: tutta la fila del bersaglio.' },
  ],
  arco: [
    { id: 'w_tiro', name: 'Tiro', icon: '🏹', kind: 'phys', power: 1.0, ranged: true, desc: 'Freccia a distanza su qualsiasi fila.' },
    { id: 'w_raffica', name: 'Raffica', icon: '🎯', kind: 'phys', power: 0.45, hits: 3, ranged: true, aoe: 'volley', desc: 'Tre frecce su nemici a caso.' },
  ],
  bastone: [
    { id: 'w_dardo', name: 'Dardo arcano', icon: '✨', kind: 'mag', power: 0.85, el: 'luce', ranged: true, desc: 'Raggio di luce a distanza (usa la Magia).' },
    { id: 'w_bastonata', name: 'Bastonata', icon: '🪄', kind: 'phys', power: 0.9, el: 'botta', guard: 1, desc: 'Colpo di bastone: −1 Guardia in più.' },
  ],
  liuto: [
    { id: 'w_nota', name: 'Nota tagliente', icon: '🎵', kind: 'mag', power: 0.85, el: 'ombra', ranged: true, desc: 'Un suono che ferisce a distanza.' },
    { id: 'w_accordo', name: 'Accordo dissonante', icon: '🎶', kind: 'mag', power: 0.4, ranged: true, target: 'enemies', desc: 'Colpisce tutti i nemici.' },
  ],
  lanterna: [
    { id: 'w_lampo', name: 'Lampo', icon: '🏮', kind: 'mag', power: 0.85, el: 'luce', ranged: true, desc: 'Bagliore accecante a distanza.' },
    { id: 'w_fiammata', name: 'Fiammata', icon: '🔥', kind: 'mag', power: 0.6, el: 'fuoco', ranged: true, aoe: 'sweep', st: [['burn', 0.3, 3]], desc: 'Fuoco sul bersaglio e accanto, può bruciare.' },
  ],
};
// Converte una mossa d'arma in un'abilità utilizzabile dal motore di combattimento
export function weaponSkill(wtype, moveId, element) {
  const list = WEAPON_MOVES[wtype] || WEAPON_MOVES.spada;
  const m = list.find((x) => x.id === moveId) || list[0];
  return { ...m, mp: 0, target: m.target || (m.aoe === 'volley' ? 'randomEnemies' : 'enemy'), reach: !!m.ranged, el: m.el || element, weapon: true };
}
