// Campagna principale: 3 atti con bivi, intermezzi e finali
export const STORY_EVENTS = {
  // ================= ATTO I =================
  a1_intro: {
    title: 'Morsa, l\'Ultimo Fuoco', art: 'town', story: true,
    text: 'Il villaggio di Morsa si stringe attorno al suo braciere, l\'unico fuoco rimasto. L\'anziana Maren vi accoglie con mani tremanti.\n«Il Faro di Grigiaterra si è spento. Senza il suo olio, il nostro braciere morirà entro la luna, e la Cenere Marea ci sommergerà. L\'Ordine della Lanterna ci ha abbandonati. Voi siete Viandanti: portate luce, o almeno portate speranza.»',
    opts: [
      { text: '«Salveremo Morsa. Avete la nostra parola.»', res: 'Maren vi stringe le mani. Il villaggio intero vi guarda partire come si guarda l\'alba.', fx: [['flag', 'a1_promessa'], ['moral', 'fiamma', 2], ['fate', 1], ['chron', 'A Morsa giurarono di riportare la luce.']] },
      { text: '«La speranza costa. Quanto potete pagare?»', res: 'Maren vi consegna una borsa con i risparmi del villaggio. Nessuno vi saluta.', fx: [['gold', 60], ['moral', 'sale', 2], ['chron', 'A Morsa accettarono l\'oro di un villaggio morente.']] },
      { text: '«Parlateci della Corte delle Falene.»', res: '«Fate della palude», sussurra Maren. «Dicono che vedano nel buio... e che prendano sempre qualcosa in cambio.» Vi regala un amuleto di seta.', fx: [['item', 'piuma_falena'], ['moral', 'falena', 2], ['chron', 'A Morsa chiesero delle falene, e della notte.']] },
    ],
  },
  a1_faro: {
    title: 'Il Faro di Grigiaterra', art: 'beacon', story: true,
    text: 'Ai piedi del faro spento, due gruppi armati si fronteggiano. Da una parte Ser Odile, capitana della Lanterna, armatura bianca e sguardo di ferro. Dall\'altra Brann Mezzamano, capo dei contrabbandieri del Sale, con un barile d\'olio sotto il braccio sano.\n«Quell\'olio appartiene all\'Ordine!» «Quell\'olio appartiene a chi l\'ha rubato per primo, cara.»\nEntrambi si voltano verso di voi.',
    opts: [
      { text: 'Schierarsi con Ser Odile e la Lanterna', res: 'Brann sputa a terra e si ritira. Odile vi ringrazia con un cenno: «L\'Ordine non dimentica.» Il faro si riaccende sotto la sua guida.', fx: [['flag', 'a1_lantern'], ['rep', 'lantern', 3], ['rep', 'salt', -2], ['moral', 'fiamma', 2], ['threat', -8], ['chron', 'Al Faro di Grigiaterra scelsero l\'Ordine della Lanterna.']] },
      { text: 'Schierarsi con Brann e la Fratellanza', res: 'Odile vi maledice e se ne va. Brann ride: «L\'olio andrà a Morsa, e a chi ne ha bisogno davvero. Non ai preti.»', fx: [['flag', 'a1_salt'], ['rep', 'salt', 3], ['rep', 'lantern', -2], ['moral', 'sale', 2], ['gold', 40], ['chron', 'Al Faro di Grigiaterra scelsero la Fratellanza del Sale.']] },
      { text: 'Convincerli a dividere l\'olio', check: { stat: 'spi', dc: 15 }, ok: { text: 'Le vostre parole sono più forti delle loro spade. Lanterna e Sale si stringono la mano, per la prima volta in una generazione.', fx: [['flag', 'a1_unita'], ['rep', 'lantern', 2], ['rep', 'salt', 2], ['fate', 2], ['threat', -6], ['moral', 'fiamma', 1], ['chron', 'Al Faro di Grigiaterra unirono Lanterna e Sale.']] }, ko: { text: 'Nessuno vi ascolta. Le spade parlano, e voi siete in mezzo.', fx: [['flag', 'a1_salt'], ['combat', ['bandito_sale', 'bandito_sale']], ['rep', 'lantern', -1], ['chron', 'Al Faro di Grigiaterra il sangue scorse sull\'olio.']] } },
      { text: 'Gettare l\'olio nel fuoco per chiamare le falene', res: 'Una colonna di fumo dolciastro sale al cielo. Odile e Brann vi guardano inorriditi. Dalla notte, mille ali rispondono al richiamo, e qualcuno nella palude ora conosce i vostri nomi.', fx: [['flag', 'a1_moth'], ['rep', 'moth', 3], ['rep', 'lantern', -2], ['rep', 'salt', -2], ['moral', 'falena', 3], ['chron', 'Al Faro di Grigiaterra offrirono l\'olio alle falene.']] },
    ],
  },
  a1_boss: {
    title: 'La Torre della Veglia', art: 'tower', story: true,
    text: 'La Torre della Veglia si alza nera contro il cielo color brace. Sulla cima, centinaia di lanterne spente pendono come frutti marci. Tra loro si muove una figura altissima, magra, con una lanterna vuota al posto della testa: il Lampionaio Cavo, che da mesi ruba la luce ai fari.',
    opts: [
      { text: 'Attaccare a viso aperto', res: 'Salite le scale. Il Lampionaio si volta, e la sua lanterna si accende di fuoco verde.', fx: [['boss', 'lampionaio']] },
      { text: 'Studiare il suo schema di movimento', check: { stat: 'int', dc: 14 }, ok: { text: 'Notate che la lanterna si incrina ogni volta che si nutre. Saprete dove colpire.', fx: [['flag', 'boss_debole'], ['boss', 'lampionaio']] }, ko: { text: 'Vi scopre mentre osservate. Nessun vantaggio.', fx: [['boss', 'lampionaio']] } },
      { text: 'Chiamare Ser Odile e i cavalieri', req: { flag: 'a1_lantern' }, res: 'Odile e dieci cavalieri caricano con voi. Il Lampionaio è circondato prima ancora di capirlo.', fx: [['flag', 'boss_debole'], ['boss', 'lampionaio']] },
      { text: 'Chiamare Brann e i suoi tagliagole', req: { flag: 'a1_salt' }, res: 'I contrabbandieri sabotano le catene delle lanterne. Metà della sua luce rubata si disperde.', fx: [['flag', 'boss_debole'], ['boss', 'lampionaio']] },
    ],
  },
  // ================= ATTO II =================
  a2_intro: {
    title: 'Pallido, ai Margini della Palude', art: 'town', story: true,
    text: 'Sono passati tre anni dalla caduta del Lampionaio. Il vostro nome si canta nelle taverne. Ma la Cenere Marea non si è fermata: ora sale dalla Palude Lamentosa, dove la Corte delle Falene regna su un\'acqua che non riflette nulla.\nNel villaggio di Pallido, una messaggera dalle ali di seta vi attende. «La Regina Ysolde vi convoca. Sa chi siete. Sa cosa avete fatto.»',
    opts: [
      { text: 'Accettare l\'invito', res: 'La messaggera sorride e si dissolve in polvere d\'oro. Sulla mappa, un sentiero di luci fatue si accende verso la Corte.', fx: [['rep', 'moth', 1], ['chron', 'Tre anni dopo, la Regina delle Falene li convocò.']] },
      { text: 'Prepararsi alla guerra', res: 'La messaggera si rabbuia. «Come preferite.» Gli abitanti di Pallido vi armano come possono.', fx: [['item', 'pozione'], ['item', 'bomba_cenere'], ['rep', 'moth', -1], ['chron', 'Tre anni dopo, risposero alla Regina con le armi in pugno.']] },
    ],
  },
  a2_corte: {
    title: 'La Corte delle Falene', art: 'moth', story: true,
    text: 'Su un trono di funghi luminescenti siede Ysolde, la Regina Falena: bellissima, terribile, con ali che contengono un cielo stellato intero. Attorno a lei, cortigiani dagli occhi sfaccettati.\n«La Chiesa dell\'Eclisse mi dà la caccia. Io posso fermare la Cenere sulla palude, ma mi serve un patto. Diventate miei campioni, e le mie falene vi guideranno nel buio per sempre. Il prezzo? Un ricordo del sole. Per ognuno di voi.»',
    opts: [
      { text: 'Accettare il patto della Regina', res: 'Ysolde vi bacia la fronte, uno per uno. Il ricordo del sole svanisce, sostituito da un buio dolce e pieno di occhi. La Corte esulta.', fx: [['flag', 'a2_pact'], ['rep', 'moth', 4], ['rep', 'lantern', -2], ['moral', 'falena', 3], ['threat', -10], ['item', 'lacrima_regina'], ['chron', 'Strinsero il patto con Ysolde, e dimenticarono il sole.']] },
      { text: 'Rifiutare: nessun patto con le fate', res: '«Sciocchi.» La sala si oscura. «Allora sarete nemici come gli altri.» Fuggite mentre le falene vi inseguono.', fx: [['flag', 'a2_war'], ['rep', 'moth', -4], ['rep', 'lantern', 2], ['moral', 'fiamma', 2], ['combat', ['falena_regale', 'falena_lamentosa', 'falena_lamentosa']], ['chron', 'Rifiutarono il patto della Regina Falena.']] },
      { text: 'Fingere di accettare e rubarle il Cuore di Seta', check: { stat: 'dex', dc: 15 }, ok: { text: 'Un gesto rapido mentre vi bacia: il Cuore di Seta, la gemma del suo potere, è vostro. Ysolde urla, ma il suo potere vacilla.', fx: [['flag', 'a2_trick'], ['rep', 'moth', -3], ['moral', 'sale', 3], ['item', 'bussola_sale'], ['gold', 120], ['chron', 'Ingannarono la Regina Falena e le rubarono il cuore.']] }, ko: { text: 'La mano di {eroe} viene afferrata da dita fredde. «Ladri.»', fx: [['flag', 'a2_war'], ['rep', 'moth', -5], ['combat', ['falena_regale', 'falena_regale']], ['chron', 'Tentarono di derubare Ysolde, e fallirono.']] } },
    ],
  },
  a2_sommerso: {
    title: 'Il Villaggio Sommerso', art: 'swamp', story: true,
    text: 'Il villaggio di Ranica sta affondando nella palude. Sui tetti, decine di persone gridano. L\'acqua sale, e sotto la superficie si muovono gli Annegati.',
    opts: [
      { text: 'Chiamare i cavalieri di Ser Odile', req: { flag: 'a1_lantern' }, res: 'Odile arriva con barche e funi. «Ve lo dovevo.» Nessuno muore a Ranica.', fx: [['flag', 'a2_salvati'], ['rep', 'lantern', 2], ['fate', 2], ['moral', 'fiamma', 1], ['chron', 'Salvarono Ranica con l\'aiuto della Lanterna.']] },
      { text: 'Chiamare le zattere di Brann', req: { flag: 'a1_salt' }, res: 'Le zattere del Sale scivolano tra i tetti. Brann chiede un pedaggio per ogni salvato, ma voi lo pagate con uno sguardo.', fx: [['flag', 'a2_salvati'], ['rep', 'salt', 2], ['fate', 2], ['chron', 'Salvarono Ranica con le zattere del Sale.']] },
      { text: 'Chiedere alle falene di guidare i superstiti', req: { flag: 'a2_pact' }, res: 'Le falene illuminano un sentiero sicuro. I superstiti vi guardano con timore reverenziale.', fx: [['flag', 'a2_salvati'], ['rep', 'moth', 2], ['fate', 1], ['moral', 'falena', 1], ['chron', 'Salvarono Ranica con la luce delle falene.']] },
      { text: 'Costruire zattere e salvarli da soli', check: { stat: 'str', dc: 15 }, ok: { text: 'Ore di fatica nell\'acqua gelida. Ce la fate. Tutti.', fx: [['flag', 'a2_salvati'], ['fate', 2], ['xp', 60], ['moral', 'fiamma', 2], ['chron', 'Salvarono Ranica con le proprie mani.']] }, ko: { text: 'Ne salvate metà. L\'altra metà canta ora tra gli Annegati.', fx: [['combat', ['annegato', 'annegato', 'rospo_palude']], ['chron', 'A Ranica, metà del villaggio annegò.']] } },
    ],
  },
  a2_boss_pact: {
    title: 'L\'Inquisitore Ceruleo', art: 'moth', story: true,
    text: 'La Chiesa dell\'Eclisse ha scoperto il vostro patto. L\'Inquisitore Ceruleo marcia sulla Corte con un esercito di accoliti, e Ysolde vi chiama: «Campioni. Difendete la vostra Regina.»',
    opts: [
      { text: 'Difendere la Corte', res: 'Le falene si stringono dietro di voi. L\'Inquisitore alza la sua spada azzurra.', fx: [['boss', 'inquisitore']] },
      { text: 'Tendere un\'imboscata nel buio', check: { stat: 'agi', dc: 14 }, ok: { text: 'Le falene spengono le torce nemiche. L\'Inquisitore combatte alla cieca.', fx: [['flag', 'boss_debole'], ['boss', 'inquisitore']] }, ko: { text: 'L\'imboscata fallisce.', fx: [['boss', 'inquisitore']] } },
    ],
  },
  a2_boss_war: {
    title: 'Il Trono di Funghi', art: 'moth', story: true,
    text: 'Raggiungete il cuore della Corte. Ysolde vi aspetta, le ali aperte come un cielo in tempesta. «Avreste potuto vedere nel buio con me. Ora vi ci perderete.»',
    opts: [
      { text: 'Affrontare la Regina', res: 'Il trono si sbriciola mentre la Regina si leva in volo.', fx: [['boss', 'ysolde']] },
      { text: 'Incendiare i funghi luminosi', check: { stat: 'int', dc: 14 }, ok: { text: 'Il fuoco si propaga, le sue figlie fuggono.', fx: [['flag', 'boss_debole'], ['boss', 'ysolde']] }, ko: { text: 'I funghi sono umidi.', fx: [['boss', 'ysolde']] } },
    ],
  },
  a2_boss_trick: {
    title: 'Il Cavaliere di Polvere', art: 'swamp', story: true,
    text: 'Senza il suo Cuore, Ysolde si è rinchiusa nel silenzio. Ma ha mandato il suo campione a riprenderselo: Ser Polvere, un\'armatura vuota tenuta insieme da falene morte, che non dorme e non dimentica.',
    opts: [
      { text: 'Affrontarlo', res: 'L\'armatura scricchiola e alza la sua mazza.', fx: [['boss', 'ser_polvere']] },
      { text: 'Usare il Cuore di Seta come esca', check: { stat: 'luk', dc: 13 }, ok: { text: 'Il cavaliere si distrae e voi colpite per primi.', fx: [['flag', 'boss_debole'], ['boss', 'ser_polvere']] }, ko: { text: 'Non abbocca.', fx: [['boss', 'ser_polvere']] } },
    ],
  },
  // ================= ATTO III =================
  a3_intro: {
    title: 'Ultimo Approdo', art: 'town', story: true,
    text: 'Cinque anni sono passati. I capelli di qualcuno di voi sono più grigi, le cicatrici più profonde. All\'orizzonte delle Distese di Cenere si alza la Cattedrale dell\'Eclisse, nera e immensa, e sopra di lei pulsa il cuore del sole spezzato.\nA Ultimo Approdo, l\'ultima città libera, la gente vi guarda come si guardano gli eroi delle leggende. O i loro fantasmi.',
    opts: [
      { text: 'Promettere la vittoria', res: 'Un boato. Per la prima volta da decenni, Ultimo Approdo festeggia.', fx: [['fate', 1], ['moral', 'fiamma', 1], ['chron', 'Cinque anni dopo, giunsero a Ultimo Approdo.']] },
      { text: 'Promettere solo di provarci', res: 'Gli sguardi si fanno seri. Ma nessuno se ne va.', fx: [['xp', 40], ['chron', 'Cinque anni dopo, giunsero a Ultimo Approdo, senza promesse.']] },
    ],
  },
  a3_alleati: {
    title: 'Il Consiglio delle Fazioni', art: 'camp', story: true,
    text: 'In una tenda ai margini delle Distese, i rappresentanti di chi vi deve qualcosa vi aspettano. Chi verrà con voi all\'assalto dipende da ciò che avete fatto in questi anni.',
    opts: [
      { text: 'Chiamare a raccolta tutti gli alleati', res: 'Chi vi deve fedeltà risponde.', fx: [['allies'], ['chron', 'Radunarono gli alleati per l\'ultima battaglia.']] },
      { text: 'Andare da soli: nessun altro deve morire', res: 'Gli alleati protestano, poi vi lasciano andare. La vostra determinazione accende il destino.', fx: [['fate', 3], ['moral', 'fiamma', 2], ['flag', 'soli'], ['chron', 'Scelsero di affrontare la Cattedrale da soli.']] },
    ],
  },
  a3_boss: {
    title: 'La Cattedrale dell\'Eclisse', art: 'cathedral', story: true,
    text: 'La navata della Cattedrale è lunga un miglio. In fondo, sotto il frammento più grande del sole spezzato, siede il Vescovo Velato. Un velo nero gli copre il volto. La sua voce è gentile.\n«Viandanti. Vi aspettavo. Sapete perché ho spezzato il sole? Perché bruciava. Ogni giorno, migliaia morivano di sete, di fuoco, di luce. Io ho dato a Vael l\'ombra. E voi volete togliergliela?»',
    opts: [
      { text: '«La luce va riaccesa, qualunque sia il prezzo.»', res: 'Il Vescovo sospira e si alza. Il velo si gonfia come una vela nera.', fx: [['moral', 'fiamma', 2], ['boss', 'vescovo']] },
      { text: 'Rivelargli la verità della Stele: anche lui amava il sole', req: { flag: 'verita_vescovo' }, check: { stat: 'spi', dc: 15 }, ok: { text: 'Il Vescovo vacilla. Per un istante, sotto il velo, piange. Il suo potere si incrina.', fx: [['flag', 'boss_debole'], ['boss', 'vescovo']] }, ko: { text: '«Quell\'uomo è morto con il sole.»', fx: [['boss', 'vescovo']] } },
      { text: 'Usare i segreti della Cattedrale', req: { flag: 'segreto_cattedrale' }, res: 'Sapete dove sono i sigilli. Ne spezzate due prima che il Vescovo se ne accorga.', fx: [['flag', 'boss_debole'], ['boss', 'vescovo']] },
      { text: '«Né sole né ombra: Vael sarà libera.»', res: 'Il Vescovo ride, sinceramente divertito. «Il Sale. Sempre il Sale.»', fx: [['moral', 'sale', 2], ['boss', 'vescovo']] },
    ],
  },
};

export const STORY = {
  1: { intro: 'a1_intro', town: 'Morsa', towns: ['Borgo Cenere', 'Vallefonda'], nodes: [{ id: 'a1_faro', at: 0.5, poi: 'story' }], boss: () => 'a1_boss', beacons: 3, crystals: 1, camps: 3, shrines: 2, dens: 2, events: 14 },
  2: { intro: 'a2_intro', town: 'Pallido', towns: ['Ranica Alta', 'Molo dei Giunchi'], nodes: [{ id: 'a2_corte', at: 0.35, poi: 'story' }, { id: 'a2_sommerso', at: 0.65, poi: 'story' }], boss: (f) => (f.a2_pact ? 'a2_boss_pact' : f.a2_trick ? 'a2_boss_trick' : 'a2_boss_war'), beacons: 3, crystals: 1, camps: 3, shrines: 2, dens: 2, events: 14 },
  3: { intro: 'a3_intro', town: 'Ultimo Approdo', towns: ['Forte Brace'], nodes: [{ id: 'a3_alleati', at: 0.5, poi: 'story' }], boss: () => 'a3_boss', beacons: 3, crystals: 1, camps: 3, shrines: 2, dens: 2, events: 14 },
};

export const CHAPTERS = {
  1: { years: 3, title: 'Interludio — Tre Anni di Cenere', text: 'Il Lampionaio Cavo è caduto. Le sue lanterne rubate si sono liberate nel cielo come lucciole, e per una notte Vael ha visto qualcosa di simile alle stelle.\nPassano tre anni. Il gruppo si separa e si ritrova, si allena, invecchia. Ma la Cenere Marea non dorme, e dalla palude arrivano voci di falene e di patti.' },
  2: { years: 5, title: 'Interludio — Cinque Anni di Ombra', text: 'La palude tace. Ciò che è accaduto alla Corte delle Falene verrà cantato in mille versioni diverse, e tutte vi riguardano.\nPassano cinque anni. La Chiesa dell\'Eclisse raduna le sue forze nella Cattedrale. Il sole spezzato pulsa più debole ogni giorno: se morirà del tutto, Vael morirà con lui.' },
};

export function computeEnding(g) {
  const f = g.flags || {};
  const bitter = g.threat >= 70;
  let id = g.mythic || 'fiamma';
  const E = {
    fiamma: { title: 'L\'Alba Riaccesa', text: 'Il Vescovo cade, e con lui il velo. I frammenti del sole si chiamano l\'un l\'altro come campane, e il Sentiero della Fiamma Ultima vi conduce al cuore della Cattedrale. Lì, la luce chiede un prezzo: un pezzo di chi la porta. Lo pagate insieme.\nIl primo mattino in trecento anni sorge su Vael. È pallido, incerto, bellissimo. I bambini di Morsa lo guardano piangendo senza sapere perché.' },
    falena: { title: 'Il Lungo Crepuscolo', text: 'Il Vescovo cade. Ma voi non riaccendete il sole: le falene vi hanno insegnato che anche il buio ha i suoi occhi. Prendete i frammenti e li disperdete nel cielo come stelle.\nVael resta un mondo di crepuscolo, ma un crepuscolo vivo: lanterne, lucciole, falene e canzoni. La Cenere Marea si ritira, addomesticata. Voi diventate i Custodi della Sera.' },
    sale: { title: 'Il Mare senza Re', text: 'Il Vescovo cade, e voi rifiutate il suo trono. Rifiutate anche la Lanterna, la Corte, ogni corona. Gettate i frammenti del sole nel Mare di Sale, dove si scioglieranno lentamente in mille luci sotto le onde.\nNon c\'è alba, a Vael. Ma non ci sono più padroni. Le maree portano luce a chi la va a cercare. È un mondo più difficile. È un mondo libero.' },
  };
  const e = { ...E[id] };
  const notes = [];
  if (f.a2_salvati) notes.push('I superstiti di Ranica fondano una città che porta i vostri nomi.');
  if (f.a1_promessa) notes.push('Morsa mantiene il suo braciere acceso per sempre, in vostro onore: avete mantenuto la promessa.');
  if (f.a1_unita) notes.push('Lanterna e Sale, uniti al Faro di Grigiaterra, governano insieme le nuove strade.');
  if (f.a2_pact) notes.push('La Regina Ysolde vi visita ogni notte di luna, ricordandovi il prezzo pagato.');
  if (f.a2_trick) notes.push('Il Cuore di Seta, ancora nelle vostre tasche, batte piano.');
  if (f.soli) notes.push('Nessun alleato morì nell\'ultima battaglia: avete portato il peso da soli.');
  if (bitter) { e.title += ' — Vittoria Amara'; notes.push('Ma la Cenere Marea aveva già divorato troppe terre. Metà di Vael è perduta, e ci vorranno generazioni per ricostruirla.'); }
  e.notes = notes;
  return e;
}

export const TOWN_SERVICES = {
  locanda: { name: 'Locanda', icon: '🛏', desc: 'Riposo completo (PV, PM, stati) e salvataggio.' },
  cappella: { name: 'Cappella', icon: '⛪', desc: 'Rianima gli eroi caduti.' },
  bottega: { name: 'Bottega', icon: '⚖', desc: 'Compra e vendi equipaggiamento.' },
  fabbro: { name: 'Fabbro', icon: '⚒', desc: 'Migliora un\'arma con un affisso.' },
  voci: { name: 'Taverna', icon: '🍺', desc: 'Ascolta le voci: rivela la mappa vicina e compra razioni.' },
};
