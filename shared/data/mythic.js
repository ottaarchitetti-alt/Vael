// Sentieri Mitici, fazioni, biomi e lore
export const MYTHIC = {
  fiamma: {
    id: 'fiamma', name: 'Sentiero della Fiamma Ultima', color: '#ffb547', icon: '🔥',
    desc: 'Il gruppo diventa il portatore dell\'ultima luce di Vael. Chi cammina su questo sentiero è disposto a bruciare se stesso perché il sole torni.',
    perks: ['+15% PV massimi a tutti', '+10% cure', 'Evocazione: Alba (1 Scintilla, una volta per battaglia)', 'Apre il finale "L\'Alba Riaccesa"'],
    bonus: { hpPct: 15, healPct: 10 }, summon: 'alba',
  },
  falena: {
    id: 'falena', name: 'Sentiero della Falena', color: '#b58bff', icon: '🦋',
    desc: 'Il gruppo accetta il crepuscolo e i suoi segreti. Le falene sussurrano le debolezze di ogni creatura e guidano tra le ombre.',
    perks: ['Debolezze nemiche sempre visibili', '+5% schivata, +2 Fortuna', 'Evocazione: Sciame', 'Apre il finale "Il Lungo Crepuscolo"'],
    bonus: { eva: 5, luk: 2 }, summon: 'sciame', revealWeak: true,
  },
  sale: {
    id: 'sale', name: 'Sentiero del Sale', color: '#7fd4ff', icon: '🌊',
    desc: 'Il gruppo rifiuta ogni corona e ogni dio. Come il mare che corrode tutto, il Sale spezza catene, chiese e destini scritti.',
    perks: ['+1 Scintilla del Fato massima', '+25% oro', '+3 velocità', 'Evocazione: Marea', 'Apre il finale "Il Mare senza Re"'],
    bonus: { spd: 3 }, summon: 'marea', fateMax: 1, goldPct: 25,
  },
};

export const FACTIONS = {
  lantern: { name: 'Ordine della Lanterna', icon: '🏮', color: '#e0a93a', desc: 'Cavalieri-sacerdoti che custodiscono i fari. Severi, devoti, a volte crudeli.' },
  moth: { name: 'Corte delle Falene', icon: '🦋', color: '#b58bff', desc: 'Fate notturne della palude. Offrono patti che non si possono rompere.' },
  salt: { name: 'Fratellanza del Sale', icon: '⚓', color: '#7fd4ff', desc: 'Contrabbandieri e disertori liberi. Fedeli solo al proprio giuramento.' },
  eclipse: { name: 'Chiesa dell\'Eclisse', icon: '🌑', color: '#ff5c7a', desc: 'Hanno spezzato il sole per "salvare il mondo dalla sua luce". Guidati dal Vescovo Velato.' },
};

export const BIOMES = {
  prato: { name: 'Prati Grigi', top: ['#6f7d45', '#7d8b4e', '#5f6c3b', '#8a9659'], side: '#5a4a35', h: [0.35, 0.6], danger: 10, decor: ['bush', 'flower', 'rock'], decorRate: 0.35 },
  bosco: { name: 'Bosco dei Sussurri', top: ['#3f5e33', '#4a6b3a', '#35512b', '#57774a'], side: '#4a3b2a', h: [0.45, 0.75], danger: 16, decor: ['pine', 'pine', 'oak'], decorRate: 0.9 },
  colline: { name: 'Colline d\'Ocra', top: ['#8a7d4a', '#9a8a55', '#7a6d3e', '#a39361'], side: '#5e4b33', h: [0.8, 1.2], danger: 13, decor: ['rock', 'bush'], decorRate: 0.4 },
  monti: { name: 'Denti di Pietra', top: ['#7a7a80', '#8c8c92', '#6a6a70', '#9a9aa0'], side: '#55555c', h: [1.6, 2.3], danger: 0, decor: ['peak'], decorRate: 1, blocked: true },
  acqua: { name: 'Acque Morte', top: ['#2c4a66', '#305270', '#27425c', '#365b7a'], side: '#1f3346', h: [0.1, 0.12], danger: 0, decor: [], decorRate: 0, blocked: true, water: true },
  palude: { name: 'Palude Lamentosa', top: ['#3d5240', '#45594a', '#344638', '#4f6650'], side: '#2e3a2c', h: [0.25, 0.4], danger: 20, decor: ['reed', 'deadtree', 'reed'], decorRate: 0.6 },
  bosco_morto: { name: 'Bosco Morto', top: ['#4b4440', '#544c46', '#433c38', '#5d554d'], side: '#3a302a', h: [0.4, 0.7], danger: 18, decor: ['deadtree', 'deadtree', 'rock'], decorRate: 0.8 },
  cenere: { name: 'Distese di Cenere', top: ['#6a6460', '#75706a', '#5e5854', '#807a73'], side: '#4a4440', h: [0.3, 0.6], danger: 22, decor: ['rock', 'pillar'], decorRate: 0.3 },
  rovine: { name: 'Rovine Solari', top: ['#8a8070', '#968c7c', '#7c7262', '#a09684'], side: '#5c5446', h: [0.5, 0.9], danger: 20, decor: ['pillar', 'pillar', 'rock'], decorRate: 0.5 },
};

export const ACTS = {
  1: { name: 'Atto I — Le Lanterne Morenti', biomes: ['prato', 'prato', 'bosco', 'bosco', 'colline'], fog: '#3a3350', sky: ['#1c1830', '#7a4a5a', '#e0905a'], threatRate: 3 },
  2: { name: 'Atto II — La Palude delle Falene', biomes: ['palude', 'palude', 'bosco_morto', 'bosco', 'prato'], fog: '#2a3a40', sky: ['#121c24', '#3a5a5a', '#9a8aa8'], threatRate: 4 },
  3: { name: 'Atto III — La Cattedrale dell\'Eclisse', biomes: ['cenere', 'cenere', 'rovine', 'bosco_morto', 'colline'], fog: '#3a2a2a', sky: ['#0e0a14', '#4a1e2a', '#b0503a'], threatRate: 5 },
};

export const LORE = `Trecento anni fa il sole di Vael era una corona d'oro che girava sopra il mondo. Poi venne l'Eclisse.
La Chiesa dell'Eclisse, convinta che la luce stesse bruciando le anime dei viventi, compì il Rito della Notte Lunga e spezzò il sole in sette frammenti. Da allora Vael vive in un crepuscolo eterno: un cielo color brace che non sorge e non tramonta.
Dai frammenti cade la Cenere Marea, una polvere grigia che spegne i fuochi, risveglia i morti e fa marcire la memoria. Solo i Fari dell'Ordine della Lanterna, alimentati da un olio sempre più raro, la tengono lontana dai villaggi.
Ma i Fari si stanno spegnendo uno ad uno. Nella palude, la Corte delle Falene offre patti a chi ha paura del buio. Sulle coste, la Fratellanza del Sale contrabbanda olio, armi e speranza.
Voi siete gli ultimi Viandanti: chi porta la luce attraverso il crepuscolo, chi la vende, chi la ruba. La vostra storia comincia a Morsa, quando l'ultimo fuoco del villaggio tremola.`;
