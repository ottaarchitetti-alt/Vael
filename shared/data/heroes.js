// Talenti, tratti di personalità, trasformazioni, nomi
export const TALENTS = {
  pelle_dura: { name: 'Pelle Dura', desc: '+3 Difesa, +10 PV.', bonus: { def: 3, hp: 10 } },
  mani_veloci: { name: 'Mani Veloci', desc: '+2 Rapidità.', bonus: { agi: 2 } },
  braccio_forte: { name: 'Braccio Forte', desc: '+2 Forza, +2 Attacco.', bonus: { str: 2, atk: 2 } },
  mente_vitrea: { name: 'Mente Vitrea', desc: '+2 Intelletto, +3 Magia.', bonus: { int: 2, mag: 3 } },
  fede_salda: { name: 'Fede Salda', desc: '+2 Spirito, +3 Difesa magica.', bonus: { spi: 2, mdef: 3 } },
  occhio_lince: { name: 'Occhio di Lince', desc: '+2 Destrezza, +3% critico.', bonus: { dex: 2, crit: 3 } },
  fortunato: { name: 'Nato sotto la Falena', desc: '+3 Fortuna.', bonus: { luk: 3 } },
  costituzione: { name: 'Costituzione di Quercia', desc: '+2 Vigore, +15 PV.', bonus: { vit: 2, hp: 15 } },
  pozzo_mana: { name: 'Pozzo di Luce', desc: '+12 PM.', bonus: { mp: 12 } },
  schivata: { name: 'Passo di Nebbia', desc: '+6% schivata.', bonus: { eva: 6 } },
  carnefice: { name: 'Carnefice', desc: '+10% danni inflitti.', bonus: { dmgPct: 10 } },
  guaritore: { name: 'Mani Sante', desc: '+20% cure.', bonus: { healPct: 20 } },
  bastione: { name: 'Bastione', desc: '+10% difesa, +2 Vigore.', bonus: { defPct: 10, vit: 2 } },
  primo_colpo: { name: 'Primo Colpo', desc: '+4 velocità in battaglia.', bonus: { spd: 4 } },
  critico: { name: 'Lama Fatale', desc: '+7% critico.', bonus: { crit: 7 } },
  equilibrio: { name: 'Equilibrio', desc: '+1 a tutte le statistiche.', bonus: { str: 1, vit: 1, int: 1, spi: 1, dex: 1, agi: 1, luk: 1 } },
  analista: { name: 'Studioso di Mostri', desc: 'Impara Analizza.', skill: 'analizza' },
  cerusico: { name: 'Cerusico da Campo', desc: 'Impara Cura.', skill: 'cura' },
  sentinella: { name: 'Sentinella', desc: 'Impara Provoca.', skill: 'provoca' },
  cecchino: { name: 'Cecchino', desc: 'Impara Freccia Mirata.', skill: 'freccia' },
};

// check: statistica con +2 nelle prove narrative
export const TRAITS = {
  coraggioso: { name: 'Coraggioso', desc: '+2 alle prove di Vigore. Non teme l\'oscurità.', check: 'vit', bonus: { hp: 5 } },
  studioso: { name: 'Studioso', desc: '+2 alle prove di Intelletto.', check: 'int' },
  furbo: { name: 'Furbo', desc: '+2 alle prove di Destrezza.', check: 'dex' },
  pio: { name: 'Pio', desc: '+2 alle prove di Spirito.', check: 'spi' },
  forzuto: { name: 'Forzuto', desc: '+2 alle prove di Forza.', check: 'str' },
  svelto: { name: 'Svelto', desc: '+2 alle prove di Rapidità.', check: 'agi' },
  fortunato: { name: 'Baciato dalla Sorte', desc: '+2 alle prove di Fortuna.', check: 'luk' },
  goloso: { name: 'Goloso', desc: 'Mangia per due, ma ha la pelle dura (+12 PV).', bonus: { hp: 12 } },
  romantico: { name: 'Romantico', desc: 'Stringe legami profondi più facilmente.' },
  cinico: { name: 'Cinico', desc: 'Difficile da ingannare (+2 Difesa magica).', bonus: { mdef: 2 } },
  collerico: { name: 'Collerico', desc: 'Si infiamma facilmente (+5% danni).', bonus: { dmgPct: 5 } },
  silenzioso: { name: 'Silenzioso', desc: 'Si muove come un\'ombra (+3% schivata).', bonus: { eva: 3 } },
  generoso: { name: 'Generoso', desc: 'Divide tutto con gli altri (+10% cure).', bonus: { healPct: 10 } },
  superstizioso: { name: 'Superstizioso', desc: 'Legge presagi ovunque (+1 Fortuna, +1 Spirito).', bonus: { luk: 1, spi: 1 } },
};

// Trasformazioni e cicatrici (Wildermyth): cambiano aspetto e statistiche
export const TRANSFORMS = {
  braccio_vetro: { name: 'Braccio di Vetro', desc: 'Il braccio è diventato vetro cantato: +4 Intelletto, +4 Magia, −3 Vigore.', bonus: { int: 4, mag: 4, vit: -3 }, check: 'int', look: 'glassArm' },
  occhio_falena: { name: 'Occhio di Falena', desc: 'Un occhio sfaccettato vede nel buio: +3 Fortuna, +5% schivata, −2 Spirito.', bonus: { luk: 3, eva: 5, spi: -2 }, check: 'luk', look: 'mothEye' },
  pelle_sale: { name: 'Pelle di Sale', desc: 'Cristalli di sale ricoprono la pelle: +5 Difesa, −2 Rapidità.', bonus: { def: 5, agi: -2 }, check: 'vit', look: 'saltSkin' },
  cuore_brace: { name: 'Cuore di Brace', desc: 'Nel petto arde un tizzone: +3 Forza, +10% danni, −8 PV.', bonus: { str: 3, dmgPct: 10, hp: -8 }, check: 'str', look: 'emberHeart' },
  ali_cenere: { name: 'Ali di Cenere', desc: 'Ali di fumo spuntano dalla schiena: +3 Rapidità, +3 velocità.', bonus: { agi: 3, spd: 3 }, check: 'agi', look: 'ashWings' },
  cicatrice: { name: 'Cicatrice Profonda', desc: 'Un ricordo doloroso: +1 Vigore, −1 Rapidità.', bonus: { vit: 1, agi: -1 }, look: 'scar' },
  aureola: { name: 'Aureola Spezzata', desc: 'Un cerchio di luce incrinata: +3 Spirito, +15% cure.', bonus: { spi: 3, healPct: 15 }, check: 'spi', look: 'halo' },
};

export const HERO_NAMES = ['Aldric', 'Mirela', 'Tobin', 'Seraphine', 'Caius', 'Ilse', 'Doran', 'Vesna', 'Oren', 'Liora', 'Bram', 'Nerys', 'Ezio', 'Agathe', 'Ruvo', 'Selka', 'Ambra', 'Corvin', 'Isotta', 'Feor'];

// Aspetto personalizzabile degli eroi (editor nella lobby)
export const LOOK = {
  skin: ['#f6dcc0', '#f2d3b3', '#e0b48c', '#c58e62', '#a8714a', '#8d5a3b', '#5e3a26', '#d9c4e8', '#b8d0c0'],
  hair: ['#2a1d17', '#4a2e1c', '#6b3e1f', '#a0582a', '#c98b3a', '#e8d27a', '#f0ead8', '#d9d9d9', '#8b1e2b', '#c0405a', '#3b4f8a', '#4a8a6a', '#7a4aa0', '#1e1e28'],
  eyes: ['#1a1418', '#5a3a1e', '#3b6ea8', '#3f7a3a', '#8a8f98', '#c9a24a', '#9a2a2a', '#9a5ad8'],
  cloth: ['', '#8a2b2b', '#b8532a', '#c9a24a', '#3f5b2e', '#2f6a6a', '#2b4f8a', '#4a3a8a', '#6b3a6e', '#2d2a3a', '#5a4a3a', '#e8e0c8'],
};
export const HAIR_STYLES = {
  corti: 'Corti', spettinati: 'Spettinati', lunghi: 'Lunghi', coda: 'Coda', treccia: 'Treccia', ricci: 'Ricci', cresta: 'Cresta', chignon: 'Chignon', rasati: 'Rasati',
};
export const BEARDS = { nessuna: 'Nessuna', corta: 'Corta', lunga: 'Lunga', baffi: 'Baffi', pizzetto: 'Pizzetto' };
export const ACCESSORIES = {
  classe: 'Della classe', nessuno: 'Nessuno', cappuccio: 'Cappuccio', elmo: 'Elmo', cappello: 'Cappello a punta', corona: 'Diadema', fascia: 'Fascia', benda: "Benda sull'occhio", fiore: 'Fiore',
};
export const DEFAULT_LOOK = { skin: '#e0b48c', hair: '#4a2e1c', hairStyle: 'corti', eyes: '#1a1418', beard: 'nessuna', cloth: '', acc: 'classe' };

// Normalizza un aspetto ricevuto dal client: solo valori ammessi
export function cleanLook(l = {}) {
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  return {
    skin: pick(l.skin, LOOK.skin, DEFAULT_LOOK.skin),
    hair: pick(l.hair, LOOK.hair, DEFAULT_LOOK.hair),
    hairStyle: pick(l.hairStyle, Object.keys(HAIR_STYLES), DEFAULT_LOOK.hairStyle),
    eyes: pick(l.eyes, LOOK.eyes, DEFAULT_LOOK.eyes),
    beard: pick(l.beard, Object.keys(BEARDS), DEFAULT_LOOK.beard),
    cloth: pick(l.cloth, LOOK.cloth, DEFAULT_LOOK.cloth),
    acc: pick(l.acc, Object.keys(ACCESSORIES), DEFAULT_LOOK.acc),
  };
}

export const BONDS = {
  amici: { name: 'Amici', icon: '🤝', desc: 'Concerto disponibile, +5% danni se combattono insieme.' },
  amanti: { name: 'Amanti', icon: '❤', desc: 'Concerto potenziato, +10% cure ricevute dal partner.' },
  rivali: { name: 'Rivali', icon: '⚡', desc: 'Concerto disponibile, +5% critico se combattono insieme.' },
};
