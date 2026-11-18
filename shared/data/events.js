// Eventi narrativi. Effetti (fx): [tipo, valore, bersaglio]
// tipi: gold, hp(% PV), mp(%), item(id|'random'|'rare'), fate, threat, rations, xp, flag, rep(fazione,v), moral(sentiero,v),
//       combat([ids]|'random'|'elite'), boss(id), transform(id,chi), trait(id,chi), stat(stat,v,chi), reveal(r), crystal, beacon, bond, chron(testo), endact, shop
// chi: roller | all | random | weakest   — {eroe} nel testo = eroe che tira (o uno a caso)
export const EVENTS = {
  // =========================== EVENTI CASUALI ===========================
  pellegrino: {
    title: 'Il Pellegrino Senza Volto', art: 'road', acts: [1, 2, 3],
    text: 'Sul ciglio della strada siede un pellegrino avvolto in bende grigie. Al posto del volto, una maschera di cera liscia. «Ho fame di storie», sussurra. «Datemene una vera, e vi dirò dove dorme il pericolo.»',
    opts: [
      { text: 'Raccontargli la storia del vostro gruppo', check: { stat: 'spi', dc: 12 }, ok: { text: 'La maschera si incrina in un sorriso. Il pellegrino disegna nella cenere la strada davanti a voi.', fx: [['reveal', 4], ['fate', 1]] }, ko: { text: '«Menzogne», sibila, e svanisce in una nuvola di cenere che vi brucia gli occhi.', fx: [['hp', -10, 'all']] } },
      { text: 'Offrirgli del cibo (−2 razioni)', req: { rations: 2 }, res: 'Mangia in silenzio, poi vi lascia un ciondolo caldo come un tizzone.', fx: [['rations', -2], ['item', 'rare'], ['moral', 'fiamma', 1]] },
      { text: 'Strappargli la maschera', check: { stat: 'str', dc: 13 }, ok: { text: 'Sotto la maschera non c\'è nulla: solo una moneta antica che rotola ai vostri piedi.', fx: [['gold', 40], ['moral', 'sale', 1]] }, ko: { text: 'La maschera vi resta in mano e brucia. Il pellegrino ride, ovunque e da nessuna parte.', fx: [['hp', -15, 'roller'], ['threat', 3]] } },
      { text: 'Passare oltre', res: 'Il pellegrino vi guarda andare via. Senza volto, ma lo sentite.' },
    ],
  },
  carro_rovesciato: {
    title: 'Il Carro Rovesciato', art: 'road', acts: [1, 2],
    text: 'Un carro della Fratellanza del Sale giace rovesciato nel fango. Il mulo è morto, il carrettiere no: è incastrato sotto una ruota e geme. Dalle casse rotte filtra un profumo di olio da lanterna.',
    opts: [
      { text: 'Sollevare il carro', check: { stat: 'str', dc: 12 }, ok: { text: 'Con uno sforzo immane liberate il carrettiere. «La Fratellanza ricorda chi aiuta», dice, e vi lascia una cassa.', fx: [['rep', 'salt', 1], ['item', 'olio_lume'], ['gold', 25], ['moral', 'fiamma', 1]] }, ko: { text: 'La ruota scivola e vi schiaccia una gamba prima che riusciate a liberarlo.', fx: [['hp', -20, 'roller'], ['rep', 'salt', 1]] } },
      { text: 'Prendere l\'olio e lasciarlo lì', res: 'Le sue maledizioni vi seguono a lungo. L\'olio, però, è buono.', fx: [['item', 'olio_lume'], ['item', 'olio_lume'], ['rep', 'salt', -2], ['moral', 'sale', 1]] },
      { text: 'Curare le sue ferite', check: { stat: 'spi', dc: 11 }, ok: { text: 'Le bende tengono. Il carrettiere vi indica un sentiero nascosto dei contrabbandieri.', fx: [['reveal', 3], ['rep', 'salt', 1], ['xp', 15]] }, ko: { text: 'Fate quel che potete. Non basta. Prima di morire vi stringe la mano.', fx: [['chron', 'Un carrettiere del Sale morì tra le loro braccia.']] } },
    ],
  },
  santuario_infranto: {
    title: 'Santuario Infranto', art: 'shrine', acts: [1, 2, 3],
    text: 'Un piccolo santuario del sole, la statua decapitata. Ai suoi piedi, ciotole di cenere e una fiammella blu che non dovrebbe esistere.',
    opts: [
      { text: 'Pregare il sole perduto', check: { stat: 'spi', dc: 13 }, ok: { text: 'La fiammella si fa d\'oro e vi entra nel petto.', fx: [['fate', 1], ['hp', 30, 'all'], ['moral', 'fiamma', 1]] }, ko: { text: 'Il silenzio è l\'unica risposta.', fx: [['threat', 2]] } },
      { text: 'Prendere la fiammella blu', check: { stat: 'dex', dc: 13 }, ok: { text: 'La fiamma danza sulle vostre dita. Non brucia: illumina.', fx: [['item', 'rare'], ['moral', 'falena', 1]] }, ko: { text: 'La fiamma vi morde e si spegne. Qualcosa nel buio se ne accorge.', fx: [['hp', -15, 'roller'], ['combat', 'random']] } },
      { text: 'Lasciare un\'offerta (15 oro)', req: { gold: 15 }, res: 'Una brezza tiepida, la prima da mesi. Le ferite pulsano meno.', fx: [['gold', -15], ['hp', 40, 'all'], ['mp', 40, 'all']] },
    ],
  },
  lupi_affamati: {
    title: 'Ululati nella Bruma', art: 'forest', acts: [1, 2], biomes: ['bosco', 'bosco_morto', 'colline', 'prato'],
    text: 'La bruma si addensa. Occhi gialli, uno, due, sei. Un branco di lupi di bruma vi circonda, ma esita: sono magri, affamati, terrorizzati da qualcosa più a est.',
    opts: [
      { text: 'Gettare loro del cibo (−3 razioni)', req: { rations: 3 }, res: 'I lupi divorano e si ritirano. Uno vi segue a distanza per un po\', come una guardia.', fx: [['rations', -3], ['moral', 'falena', 1], ['fate', 1]] },
      { text: 'Spaventarli con il fuoco', check: { stat: 'int', dc: 12 }, ok: { text: 'Una torcia improvvisata e un grido. Il branco si disperde.', fx: [['xp', 10]] }, ko: { text: 'La torcia si spegne nella bruma. I lupi attaccano.', fx: [['combat', ['lupo_bruma', 'lupo_bruma', 'lupo_bruma']]] } },
      { text: 'Combattere', res: 'Le lame escono dai foderi.', fx: [['combat', ['lupo_bruma', 'lupo_bruma']]] },
    ],
  },
  bambina_lanterna: {
    title: 'La Bambina con la Lanterna', art: 'road', acts: [1, 2, 3],
    text: 'Una bambina scalza cammina da sola con una lanterna spenta. «Sto cercando la mamma. È andata a prendere l\'olio al faro, tre giorni fa.» I suoi occhi sono troppo vecchi per il suo viso.',
    opts: [
      { text: 'Accompagnarla al villaggio più vicino', res: 'Camminate con lei per mezza giornata. Quando vi voltate, è sparita, ma la lanterna è rimasta: ora arde.', fx: [['threat', 3], ['item', 'lanterna_votiva'], ['moral', 'fiamma', 2]] },
      { text: 'Osservarla meglio', check: { stat: 'luk', dc: 14 }, ok: { text: 'Notate che non proietta ombra. È una fata della Corte. Ride, scoperta, e vi lascia un dono.', fx: [['item', 'piuma_falena'], ['rep', 'moth', 1], ['moral', 'falena', 1]] }, ko: { text: 'Vi perdete nei suoi occhi. Quando vi risvegliate è passato un giorno.', fx: [['threat', 4], ['rations', -1]] } },
      { text: 'Darle un po\' di olio (oggetto: Olio di Lume)', req: { item: 'olio_lume' }, res: 'La lanterna si accende. «Grazie», dice con voce di donna adulta. Una luce vi segue per giorni.', fx: [['useitem', 'olio_lume'], ['fate', 2], ['moral', 'fiamma', 1]] },
    ],
  },
  mercante_ombra: {
    title: 'Il Mercante d\'Ombra', art: 'merchant', acts: [1, 2, 3],
    text: 'Un uomo con un mantello cucito di cento tasche apre il suo banco sotto un albero morto. «Vendo tutto. Compro tutto. Anche ricordi, se ne avete di troppo pesanti.»',
    opts: [
      { text: 'Guardare la merce', res: 'Il mercante sorride con troppi denti.', fx: [['shop', 'ombra']] },
      { text: 'Vendere un ricordo doloroso (+60 oro)', res: '{eroe} chiude gli occhi. Quando li riapre, qualcosa manca. Ma pesa meno.', fx: [['gold', 60], ['stat', 'spi', -1, 'random'], ['moral', 'sale', 1]] },
      { text: 'Andarsene', res: 'Il banco è già sparito.' },
    ],
  },
  ponte_vecchio: {
    title: 'Il Ponte delle Ossa', art: 'bridge', acts: [1, 2, 3],
    text: 'Un ponte di corda e ossa attraversa una gola piena di nebbia. A metà, le assi sono marce. Dall\'altra parte, un forziere con lo stemma della Lanterna.',
    opts: [
      { text: 'Attraversare con agilità', check: { stat: 'agi', dc: 13 }, ok: { text: '{eroe} danza sulle assi e torna con il forziere.', fx: [['gold', 35], ['item', 'random']] }, ko: { text: 'Un\'asse cede. {eroe} si aggrappa per miracolo, ma si ferisce.', fx: [['hp', -25, 'roller'], ['transform', 'cicatrice', 'roller']] } },
      { text: 'Rinforzare il ponte', check: { stat: 'int', dc: 12 }, ok: { text: 'Un lavoro paziente. Il ponte regge e trovate anche un passaggio laterale.', fx: [['gold', 35], ['reveal', 2]] }, ko: { text: 'Ore perse. Il ponte è inaffidabile.', fx: [['threat', 3]] } },
      { text: 'Lasciar perdere', res: 'Il forziere resterà lì, ad aspettare qualcun altro.' },
    ],
  },
  vetro_cantante: {
    title: 'La Pioggia di Vetro', art: 'crystal', acts: [1, 2, 3],
    text: 'Dal cielo cade una pioggia di schegge di vetro che cantano. Dove toccano il suolo crescono fiori trasparenti. Uno, più grande, pulsa di luce.',
    opts: [
      { text: 'Toccare il fiore di vetro', check: { stat: 'int', dc: 14 }, ok: { text: 'Il vetro risale lungo il braccio di {eroe}, cantando. Non fa male. Cambia tutto.', fx: [['transform', 'braccio_vetro', 'roller'], ['xp', 20]] }, ko: { text: 'Il fiore si frantuma, le schegge tagliano.', fx: [['hp', -20, 'roller']] } },
      { text: 'Raccogliere i frammenti', res: 'Frammenti preziosi, per chi sa venderli.', fx: [['gold', 30]] },
      { text: 'Ripararsi e aspettare', res: 'La pioggia finisce. Il canto resta nelle orecchie per ore.', fx: [['mp', 30, 'all']] },
    ],
  },
  fuoco_viandanti: {
    title: 'Il Fuoco dei Viandanti', art: 'camp', acts: [1, 2, 3],
    text: 'Altri viaggiatori attorno a un fuoco: una famiglia in fuga dalla Cenere Marea. Il padre impugna un forcone, la madre stringe due bambini.',
    opts: [
      { text: 'Condividere il fuoco e le razioni (−2)', req: { rations: 2 }, res: 'Una notte di storie e canzoni. All\'alba vi lasciano tutto ciò che hanno: poco, ma di cuore.', fx: [['rations', -2], ['hp', 50, 'all'], ['fate', 1], ['bond'], ['moral', 'fiamma', 1]] },
      { text: 'Chiedere notizie', check: { stat: 'luk', dc: 10 }, ok: { text: 'Vi raccontano di un faro ancora acceso e di un passaggio sicuro.', fx: [['reveal', 4]] }, ko: { text: 'Sono troppo spaventati per parlare.', fx: [] } },
      { text: 'Derubarli', res: 'Nessuno vi ferma. Nessuno vi perdonerà.', fx: [['gold', 25], ['rations', 3], ['moral', 'sale', 1], ['moral', 'fiamma', -2], ['chron', 'Derubarono una famiglia in fuga, senza esitare.']] },
    ],
  },
  tomba_cavaliere: {
    title: 'La Tomba del Cavaliere', art: 'ruins', acts: [1, 2, 3],
    text: 'Un tumulo con una spada conficcata. Sulla lapide: «Qui giace Ser Aldo della Lanterna, che non lasciò spegnere il fuoco». La spada è intatta.',
    opts: [
      { text: 'Estrarre la spada', check: { stat: 'str', dc: 14 }, ok: { text: 'La lama esce con un suono di campana. Un\'ombra dorata annuisce.', fx: [['item', 'spada_lunga'], ['moral', 'fiamma', 1]] }, ko: { text: 'Dal tumulo emerge il custode, furioso.', fx: [['combat', ['cavaliere_vuoto']]] } },
      { text: 'Rendere omaggio', res: 'Un attimo di silenzio. Vi sentite osservati, e protetti.', fx: [['fate', 1], ['rep', 'lantern', 1]] },
      { text: 'Profanare il tumulo', check: { stat: 'dex', dc: 11 }, ok: { text: 'Oro antico, e un brivido che non passa.', fx: [['gold', 50], ['threat', 4], ['moral', 'sale', 1]] }, ko: { text: 'Le ossa si alzano.', fx: [['combat', ['cavaliere_vuoto', 'spettro_bruma']]] } },
    ],
  },
  falena_gigante: {
    title: 'La Falena Ferita', art: 'moth', acts: [1, 2],
    text: 'Una falena grande come un cavallo giace in un cerchio di funghi, un\'ala trafitta da un dardo dell\'Eclisse. Le sue antenne vi sfiorano, implorando.',
    opts: [
      { text: 'Estrarre il dardo', check: { stat: 'dex', dc: 12 }, ok: { text: 'La falena si rialza e vi spolvera d\'oro. Uno dei suoi occhi resta impresso nella mente di {eroe}… e in uno dei suoi occhi.', fx: [['transform', 'occhio_falena', 'roller'], ['rep', 'moth', 2], ['moral', 'falena', 1]] }, ko: { text: 'La falena urla e la polvere vi stordisce.', fx: [['hp', -15, 'all'], ['rep', 'moth', 1]] } },
      { text: 'Finirla e prendere le ali', res: 'Seta di falena, preziosissima. La Corte lo saprà.', fx: [['item', 'veste_falena'], ['rep', 'moth', -3], ['moral', 'sale', 1]] },
      { text: 'Lasciarla al suo destino', res: 'Il suo lamento vi segue a lungo.' },
    ],
  },
  contrabbandieri: {
    title: 'Contrabbandieri al Guado', art: 'river', acts: [1, 2, 3],
    text: 'Al guado, tre contrabbandieri del Sale stanno caricando casse su una zattera. Vi vedono. Le mani vanno ai coltelli, poi si fermano.',
    opts: [
      { text: 'Proporre un affare', check: { stat: 'luk', dc: 12 }, ok: { text: 'Uno scambio onesto, tra disonesti.', fx: [['shop', 'sale'], ['rep', 'salt', 1]] }, ko: { text: 'Non si fidano. Se ne vanno con un gesto osceno.', fx: [] } },
      { text: 'Denunciarli nel nome della Lanterna', res: 'Combattono. L\'Ordine apprezzerà.', fx: [['combat', ['bandito_sale', 'bandito_sale']], ['rep', 'lantern', 2], ['rep', 'salt', -2], ['moral', 'fiamma', 1]] },
      { text: 'Unirsi a loro per una notte', res: 'Rum, canzoni e storie di libertà. All\'alba vi lasciano una mappa.', fx: [['reveal', 5], ['rep', 'salt', 2], ['moral', 'sale', 2], ['rations', -1]] },
    ],
  },
  cuore_brace_ev: {
    title: 'La Fornace Abbandonata', art: 'ruins', acts: [2, 3],
    text: 'Una fornace di fabbro ancora calda dopo secoli. Al centro, un tizzone pulsa come un cuore.',
    opts: [
      { text: 'Prendere il tizzone a mani nude', check: { stat: 'vit', dc: 14 }, ok: { text: 'Il tizzone si scioglie nel petto di {eroe}. Ora arde dall\'interno.', fx: [['transform', 'cuore_brace', 'roller']] }, ko: { text: 'Ustioni gravi.', fx: [['hp', -30, 'roller']] } },
      { text: 'Usare la fornace per forgiare', check: { stat: 'int', dc: 12 }, ok: { text: 'Le vostre armi escono più affilate.', fx: [['item', 'rare']] }, ko: { text: 'Il metallo si deforma.', fx: [['gold', -10]] } },
      { text: 'Scaldarsi e riposare', res: 'Per la prima volta da settimane, avete caldo.', fx: [['hp', 60, 'all'], ['mp', 30, 'all']] },
    ],
  },
  annegati_canto: {
    title: 'Il Coro degli Annegati', art: 'swamp', acts: [2], biomes: ['palude', 'acqua'],
    text: 'Dall\'acqua nera emergono volti pallidi che cantano una ninna nanna. Vi chiamano per nome, anche quelli che non avete mai detto.',
    opts: [
      { text: 'Tapparsi le orecchie e proseguire', check: { stat: 'vit', dc: 13 }, ok: { text: 'Resistete. Il canto si spegne alle vostre spalle.', fx: [['xp', 20]] }, ko: { text: '{eroe} cammina verso l\'acqua prima che lo fermiate.', fx: [['hp', -25, 'roller'], ['combat', ['annegato', 'annegato']]] } },
      { text: 'Cantare con loro', check: { stat: 'spi', dc: 14 }, ok: { text: 'Le voci si placano. Uno degli annegati vi porge un oggetto dal fondo.', fx: [['item', 'lacrima_regina'], ['moral', 'falena', 1]] }, ko: { text: 'Il canto vi trascina giù.', fx: [['hp', -20, 'all']] } },
      { text: 'Bruciare la riva', res: 'Le voci urlano. Poi silenzio.', fx: [['combat', ['annegato', 'rospo_palude']], ['moral', 'fiamma', 1]] },
    ],
  },
  re_sale: {
    title: 'La Statua di Sale', art: 'ruins', acts: [2, 3],
    text: 'Una statua di sale raffigura un uomo che piange. Toccandola, sentite che è viva: un disertore della Chiesa, punito dal Vescovo.',
    opts: [
      { text: 'Spezzare la maledizione', check: { stat: 'int', dc: 15 }, ok: { text: 'Il sale si scioglie. L\'uomo vi racconta i segreti della Cattedrale prima di morire libero.', fx: [['flag', 'segreto_cattedrale'], ['moral', 'sale', 2], ['xp', 30]] }, ko: { text: 'Il sale risale lungo la mano di {eroe}.', fx: [['transform', 'pelle_sale', 'roller']] } },
      { text: 'Pregare per lui', res: 'Una lacrima di sale cade. La raccogliete.', fx: [['item', 'anello_sale'], ['moral', 'fiamma', 1]] },
      { text: 'Andarsene', res: 'Il pianto continua alle vostre spalle.' },
    ],
  },
  accoliti_rito: {
    title: 'Il Rito degli Accoliti', art: 'ruins', acts: [2, 3],
    text: 'Tre accoliti dell\'Eclisse stanno incatenando un prigioniero a un altare nero. La Cenere Marea si addensa sopra di loro come un vortice.',
    opts: [
      { text: 'Attaccare subito', res: 'Interrompete il rito con l\'acciaio.', fx: [['combat', ['accolito', 'cenerario', 'cenerario']], ['threat', -6], ['moral', 'fiamma', 1]] },
      { text: 'Infiltrarsi travestiti', check: { stat: 'dex', dc: 14 }, ok: { text: 'Liberate il prigioniero e rubate le offerte senza essere visti.', fx: [['gold', 60], ['threat', -4], ['moral', 'falena', 1]] }, ko: { text: 'Scoperti!', fx: [['combat', ['accolito', 'accolito', 'cenerario']]] } },
      { text: 'Lasciarli fare', res: 'Il vortice si gonfia. La Cenere Marea avanza.', fx: [['threat', 8]] },
    ],
  },
  ali_cenere_ev: {
    title: 'Il Nido di Cenere', art: 'ruins', acts: [3],
    text: 'In cima a una torre crollata, un nido fatto di piume di cenere. Un uovo nero pulsa. Le piume sussurrano di cieli perduti.',
    opts: [
      { text: 'Indossare le piume', check: { stat: 'agi', dc: 14 }, ok: { text: 'Le piume si fondono con la schiena di {eroe}. Ali di fumo.', fx: [['transform', 'ali_cenere', 'roller']] }, ko: { text: 'Le piume si sbriciolano, il vento vi getta giù.', fx: [['hp', -25, 'roller']] } },
      { text: 'Distruggere l\'uovo', res: 'Un urlo nella mente. La Cenere Marea si ritrae.', fx: [['threat', -8], ['moral', 'fiamma', 1]] },
      { text: 'Prendere l\'uovo per venderlo', res: 'Pesa come un peccato. I mercanti pagheranno.', fx: [['gold', 90], ['threat', 3], ['moral', 'sale', 1]] },
    ],
  },
  aureola_ev: {
    title: 'La Campana Sepolta', art: 'shrine', acts: [2, 3],
    text: 'Una campana di bronzo sepolta per metà nella cenere. Se la suonate, dice la leggenda, il sole ascolta.',
    opts: [
      { text: 'Suonare la campana', check: { stat: 'spi', dc: 15 }, ok: { text: 'Un cerchio di luce incrinata appare sopra il capo di {eroe}.', fx: [['transform', 'aureola', 'roller'], ['threat', -5]] }, ko: { text: 'Il suono richiama qualcosa dalla cenere.', fx: [['combat', 'random']] } },
      { text: 'Scavare sotto la campana', check: { stat: 'str', dc: 12 }, ok: { text: 'Un ripostiglio di sacerdoti.', fx: [['item', 'brace_vitale'], ['item', 'etere']] }, ko: { text: 'La campana crolla su un piede.', fx: [['hp', -15, 'roller']] } },
    ],
  },
  bivacco_ordine: {
    title: 'Il Bivacco dell\'Ordine', art: 'camp', acts: [1, 2, 3],
    text: 'Cavalieri della Lanterna riposano attorno a un braciere. Il capitano vi squadra. «Viandanti. Sapete che la Cenere avanza? Avete visto dei disertori?»',
    opts: [
      { text: 'Chiedere rifornimenti in nome della Lanterna', req: { rep: ['lantern', 2] }, res: 'Il capitano annuisce. «Chi aiuta i fari è nostro fratello.»', fx: [['item', 'pozione'], ['item', 'pozione'], ['item', 'etere'], ['rations', 3]] },
      { text: 'Mentire sui disertori', check: { stat: 'luk', dc: 12 }, ok: { text: 'Vi credono. Da qualche parte, un disertore del Sale vi deve la vita.', fx: [['rep', 'salt', 2]] }, ko: { text: 'Il capitano vi guarda a lungo. «Andatevene.»', fx: [['rep', 'lantern', -2]] } },
      { text: 'Allenarsi con loro', check: { stat: 'str', dc: 13 }, ok: { text: 'Un buon allenamento. Imparate qualche trucco.', fx: [['xp', 30], ['rep', 'lantern', 1]] }, ko: { text: 'Botte e risate.', fx: [['hp', -10, 'roller'], ['xp', 10]] } },
    ],
  },
  pozzo_desideri: {
    title: 'Il Pozzo dei Desideri Rovesciati', art: 'well', acts: [1, 2, 3],
    text: 'Un pozzo antico. Dal fondo sale una voce: «Gettate una moneta e chiedete. Ma ogni desiderio si avvera al contrario.»',
    opts: [
      { text: 'Desiderare di essere poveri (10 oro)', req: { gold: 10 }, res: 'Il pozzo ride e sputa monete.', fx: [['gold', 55]] },
      { text: 'Desiderare la sfortuna', res: 'La voce sospira: «Furbi.» Vi sentite più leggeri.', fx: [['fate', 1]] },
      { text: 'Desiderare che la Cenere vinca', check: { stat: 'luk', dc: 15 }, ok: { text: 'Il pozzo tossisce cenere. Lontano, un faro si riaccende.', fx: [['threat', -10]] }, ko: { text: 'Il pozzo non era rovesciato. Era bugiardo.', fx: [['threat', 8]] } },
    ],
  },
  gemelli_specchio: {
    title: 'I Gemelli dello Specchio', art: 'crystal', acts: [2, 3],
    text: 'Uno specchio alto tre metri in mezzo al nulla. I vostri riflessi vi guardano. Poi sorridono, prima di voi.',
    opts: [
      { text: 'Affrontare i riflessi', res: 'I riflessi escono dallo specchio.', fx: [['combat', 'elite']] },
      { text: 'Parlare con il riflesso di {eroe}', check: { stat: 'int', dc: 14 }, ok: { text: 'Il riflesso vi svela un segreto: come diventare più forti.', fx: [['xp', 50]] }, ko: { text: 'Il riflesso vi convince di cose terribili.', fx: [['stat', 'spi', -1, 'roller']] } },
      { text: 'Spezzare lo specchio', res: 'Sette anni di sventura? Nel crepuscolo, chi li conta.', fx: [['fate', -1], ['gold', 40]] },
    ],
  },
  stele_lore: {
    title: 'La Stele del Primo Mattino', art: 'ruins', acts: [1, 2, 3],
    text: 'Una stele coperta di glifi solari. Racconta del giorno in cui il sole fu spezzato: sette sacerdoti, sette frammenti, e un ottavo, che pianse.',
    opts: [
      { text: 'Decifrare i glifi', check: { stat: 'int', dc: 13 }, ok: { text: 'L\'ottavo sacerdote era il Vescovo. Pianse perché amava il sole. E lo spezzò comunque.', fx: [['flag', 'verita_vescovo'], ['xp', 25]] }, ko: { text: 'I glifi danzano davanti agli occhi.', fx: [] } },
      { text: 'Ricopiare la stele per venderla', res: 'Gli studiosi pagheranno bene.', fx: [['gold', 30]] },
    ],
  },

  // =========================== LUOGHI SPECIALI ===========================
  faro: {
    title: 'Un Faro Spento', art: 'beacon', acts: [1, 2, 3], special: true,
    text: 'Una torre di pietra con una grande lanterna in cima, fredda e muta. Se riusciste a riaccenderla, la Cenere Marea si ritirerebbe da queste terre.',
    opts: [
      { text: 'Riaccendere il faro con l\'ingegno', check: { stat: 'int', dc: 13 }, ok: { text: 'Il meccanismo gira, la fiamma risale. Una luce dorata spazza le colline!', fx: [['beacon'], ['rep', 'lantern', 1], ['moral', 'fiamma', 1]] }, ko: { text: 'Il meccanismo si inceppa. Riproverete più tardi.', fx: [['threat', 2], ['keep']] } },
      { text: 'Usare Olio di Lume', req: { item: 'olio_lume' }, res: 'L\'olio brucia limpido. Il faro canta.', fx: [['useitem', 'olio_lume'], ['beacon'], ['fate', 1]] },
      { text: 'Smontare il faro per i materiali', res: 'Ottone e vetro valgono molto. Ma il faro non brillerà più.', fx: [['gold', 70], ['threat', 5], ['moral', 'sale', 2], ['rep', 'lantern', -2]] },
    ],
  },
  cristallo: {
    title: 'Il Cristallo Spento', art: 'crystal', acts: [1, 2, 3], special: true,
    text: 'Un cristallo grande come una casa, opaco e incrinato: uno dei Cristalli che un tempo conservavano le arti degli antichi Viandanti. Dentro, una luce debolissima.',
    opts: [
      { text: 'Risvegliarlo con la volontà', check: { stat: 'spi', dc: 13 }, ok: { text: 'Il cristallo si illumina e vi mostra le vite di altri Viandanti. Ognuno di voi potrà apprendere un mestiere secondario.', fx: [['crystal'], ['xp', 30]] }, ko: { text: 'Il cristallo resiste. Ma la luce si è mossa.', fx: [['hp', -10, 'roller'], ['keep']] } },
      { text: 'Risvegliarlo con la forza', check: { stat: 'str', dc: 15 }, ok: { text: 'Una crepa, poi luce. Funziona.', fx: [['crystal']] }, ko: { text: 'Le schegge volano.', fx: [['hp', -20, 'roller'], ['keep']] } },
    ],
  },
  santuario: {
    title: 'Santuario delle Scintille', art: 'shrine', acts: [1, 2, 3], special: true,
    text: 'Un cerchio di pietre dove la cenere non si posa. Al centro, scintille dorate danzano nell\'aria come lucciole.',
    opts: [
      { text: 'Raccogliere le scintille', res: 'Le scintille si posano su di voi. Il destino si piega un poco.', fx: [['fate', 2]] },
      { text: 'Meditare', res: 'Corpo e spirito si ristorano.', fx: [['hp', 100, 'all'], ['mp', 100, 'all']] },
    ],
  },
  covo: {
    title: 'Un Covo Oscuro', art: 'ruins', acts: [1, 2, 3], special: true,
    text: 'Una grotta che puzza di zolfo. Ossa all\'ingresso. Dentro, il bagliore di un tesoro… e qualcosa di grosso che respira.',
    opts: [
      { text: 'Entrare e combattere', res: 'Armi in pugno, entrate.', fx: [['combat', 'elite'], ['item', 'rare'], ['gold', 40]] },
      { text: 'Sgattaiolare dentro', check: { stat: 'dex', dc: 15 }, ok: { text: 'Prendete parte del tesoro senza svegliare il guardiano.', fx: [['item', 'rare']] }, ko: { text: 'Il guardiano si sveglia.', fx: [['combat', 'elite'], ['item', 'rare']] } },
      { text: 'Lasciar perdere', res: 'Meglio vivi che ricchi.', fx: [['keep']] },
    ],
  },
};

// =========================== SCENE DI ACCAMPAMENTO (Wildermyth) ===========================
// {a} e {b} = i due eroi coinvolti
export const CAMP_SCENES = [
  { text: '{a} non riesce a dormire. Trova {b} sveglio vicino al fuoco, a fissare il cielo senza stelle. «Ti ricordi com\'era il sole?» chiede {b}.', a: 'Raccontargli un ricordo d\'infanzia', b: 'Rispondere che il passato non conta' },
  { text: '{a} e {b} litigano su chi abbia sbagliato strada oggi. Le voci si alzano, il gruppo guarda.', a: 'Fare pace con una battuta', b: 'Lasciare che il litigio si accenda' },
  { text: '{b} si è ferito alla mano. {a} prende le bende senza dire una parola.', a: 'Fasciargli la mano con cura', b: 'Prenderlo in giro per la sua goffaggine' },
  { text: '{a} canticchia una canzone che sua madre cantava. {b} la conosce, e si unisce a bassa voce.', a: 'Cantare insieme fino all\'alba', b: 'Sfidarlo a chi la sa cantare meglio' },
  { text: '{a} sorprende {b} a scrivere una lettera che non potrà mai spedire.', a: 'Chiedere a chi è destinata', b: 'Leggerla di nascosto e commentarla' },
  { text: 'Durante la guardia notturna, {a} e {b} vedono una stella cadente, la prima da anni.', a: 'Esprimere un desiderio insieme', b: 'Scommettere su chi l\'ha vista per primo' },
];
export const SOLO_SCENES = [
  { text: '{a} siede da solo accanto al fuoco. Nel crepitio delle braci sente la voce di chi ha perso.', a: 'Ascoltare le voci (+1 Spirito)', b: 'Allenarsi fino all\'alba (+1 Forza)', fa: [['stat', 'spi', 1, 'roller']], fb: [['stat', 'str', 1, 'roller']] },
  { text: '{a} studia una vecchia mappa alla luce della lanterna.', a: 'Studiare le stelle (+1 Intelletto)', b: 'Esercitare la mano (+1 Destrezza)', fa: [['stat', 'int', 1, 'roller']], fb: [['stat', 'dex', 1, 'roller']] },
];
