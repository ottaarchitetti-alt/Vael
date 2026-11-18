// Campagna tutorial: una breve avventura guidata che mostra tutte le funzionalità del gioco.
// La usano server/game.js (startTutorial), server/mapgen.js (mappa) e il client (missioni e suggerimenti).

export const TUTORIAL_STORY = {
  intro: 'tut_intro', town: 'Lumino', towns: [],
  nodes: [{ id: 'tut_prova' }, { id: 'tut_covo' }],
  boss: () => 'tut_boss',
};

export const TUTORIAL_GOALS = {
  tut_prova: 'Supera la prova del Ponte Sospeso',
  tut_covo: 'Sgomina i predoni del Covo',
  tut_boss: 'Abbatti la Sentinella Cava nella Torre Spezzata',
};

// Eroi già pronti: un combattente in prima fila, una maga e una curatrice
export const TUTORIAL_HEROES = [
  { name: 'Odo', cls: 'lama', look: { skin: '#e0b48c', hair: '#6b3e1f', hairStyle: 'corti', eyes: '#3b6ea8', beard: 'corta', cloth: '', acc: 'classe' } },
  { name: 'Iris', cls: 'arcanista', look: { skin: '#f2d3b3', hair: '#c0405a', hairStyle: 'lunghi', eyes: '#3f7a3a', beard: 'nessuna', cloth: '', acc: 'classe' } },
  { name: 'Bruna', cls: 'custode', look: { skin: '#8d5a3b', hair: '#1e1e28', hairStyle: 'treccia', eyes: '#5a3a1e', beard: 'nessuna', cloth: '', acc: 'nessuno' } },
];

export const TUTORIAL_EVENTS = {
  tut_intro: {
    title: 'Lumino, la Scuola dei Viandanti', art: 'town', story: true,
    text: 'Nel villaggio di Lumino, la vecchia maestra Ada addestra i nuovi Viandanti. «Oltre il ponte c\'è una torre spezzata, e dentro una Sentinella Cava che ruba la luce ai viaggiatori. È la vostra prova. Prima di partire, però, ditemi: con che spirito affronterete la strada?»',
    opts: [
      { text: '«Con coraggio: porteremo luce a chi ne ha bisogno.»', res: 'Ada sorride. «Il Fato ama i cuori generosi.» Vi dona una Scintilla del Fato.', fx: [['fate', 1], ['moral', 'fiamma', 1]] },
      { text: '«Con prudenza: dateci provviste.»', res: 'Ada vi riempie gli zaini di pane nero e carne secca.', fx: [['rations', 4]] },
      { text: '«Con astuzia: cosa sapete della Sentinella?»', res: '«Teme il fuoco e la luce», sussurra Ada. «E la sua guardia si spezza se la colpite dove è debole.»', fx: [['flag', 'tut_info'], ['xp', 10]] },
    ],
  },
  tut_prova: {
    title: 'Il Ponte Sospeso', art: 'bridge', story: true,
    text: 'Un ponte di corde oscilla sopra un burrone pieno di nebbia. Alcune assi mancano. Qualcuno dovrà attraversarlo per primo e fissare le corde dall\'altra parte.',
    opts: [
      { text: 'Attraversare con agilità', check: { stat: 'agi', dc: 12 }, ok: { text: '{eroe} danza sulle assi e fissa le corde. Il gruppo passa sano e salvo.', fx: [['xp', 50], ['gold', 20]] }, ko: { text: '{eroe} scivola e resta appeso a una corda prima di riuscire a tirarsi su. Passate, ma con qualche livido.', fx: [['hp', -15, 'roller'], ['xp', 50]] } },
      { text: 'Rinforzare il ponte con la forza', check: { stat: 'str', dc: 12 }, ok: { text: '{eroe} tende le corde come quelle di un arco. Il ponte regge.', fx: [['xp', 50], ['gold', 20]] }, ko: { text: 'Una corda si spezza e frusta il braccio di {eroe}. Alla fine il ponte regge comunque.', fx: [['hp', -15, 'roller'], ['xp', 50]] } },
    ],
  },
  tut_covo: {
    title: 'Il Covo dei Predoni', art: 'den', story: true,
    text: 'Tra le rocce si apre una grotta illuminata da un fuoco verde. Un Cenerario e il suo lupo vi sbarrano la strada. «La luce che portate... datela a noi!»',
    opts: [
      { text: 'Combattere', res: 'Sguainate le armi.', fx: [['combat', ['cenerario', 'lupo_bruma']]] },
    ],
  },
  tut_boss: {
    title: 'La Torre Spezzata', art: 'tower', story: true,
    text: 'In cima alla torre crollata, una corazza vuota si rialza da sola. Nell\'elmo brilla una fiammella rubata. È la Sentinella Cava.',
    opts: [
      { text: 'Affrontare la Sentinella', res: 'La corazza si volta verso di voi, cigolando.', fx: [['boss', 'sentinella_cava']] },
    ],
  },
};

export const TUTORIAL_ENDING = {
  title: 'Tutorial completato!',
  text: 'La Sentinella Cava crolla in un mucchio di ferraglia e la fiammella rubata torna a brillare nel cielo. Ada vi aspetta ai piedi della torre: «Ora siete Viandanti. Il vero viaggio vi attende.»\nHai visto tutto ciò che serve: il viaggio a giornate, le prove con il d20 e il Fato, le città, gli accampamenti, i fari, i cristalli e le battaglie. Torna al menu principale per iniziare una vera campagna, da solo o con gli amici.',
  notes: [],
};

// Mappa disegnata a mano: la riga 2 è la strada; le righe 1 e 3 sono boschi e colline, chiusi da gole
// accanto a ogni luogo, così il sentiero passa per forza da tutti; le righe 0 e 4 sono acqua e monti.
export const TUTORIAL_MAP = {
  w: 16, h: 5,
  pois: {
    1: { t: 'town', name: 'Lumino', main: true },
    3: { t: 'story', id: 'tut_prova' },
    5: { t: 'town', name: 'Borgo Lume' },
    7: { t: 'camp' },
    8: { t: 'beacon' },
    10: { t: 'story', id: 'tut_covo' },
    12: { t: 'crystal' },
    14: { t: 'boss', name: 'Torre Spezzata' },
  },
};
