# Ceneri di Vael

Gioco di ruolo cooperativo per 1–4 giocatori, nel browser, in stile HD-2D (sprite pixel-art dentro diorami 3D con profondità di campo, bloom e luci calde). Uno dei giocatori ospita la partita sul proprio PC; gli altri entrano da un link, in LAN o via Internet, senza installare nulla.

## Requisiti

- [Node.js](https://nodejs.org) 20 o superiore (solo sul PC di chi ospita)
- Un browser moderno (Chrome, Edge, Firefox) per ogni giocatore

## Avvio rapido (Windows)

1. Una sola volta, nella cartella del gioco: `npm install`
2. Per giocare **in casa/LAN**: doppio clic su `avvia.bat` (oppure `npm start`)
3. Per giocare **via Internet** con amici lontani: doppio clic su `avvia-online.bat` (oppure `npm run host`)

Il server apre automaticamente il browser dell'host. Nella finestra del terminale trovi:

- **Host (apri tu questo)**: il link riservato a chi ospita (contiene la chiave host)
- **Codice stanza**: 4 lettere da comunicare agli amici
- **LAN**: il link per chi è sulla stessa rete Wi‑Fi
- **INTERNET**: il link pubblico `https://...` da mandare agli amici lontani (solo con `avvia-online.bat`)

Gli stessi link sono nella lobby, nel pannello **Invita i compagni**, con il pulsante **Copia**.

### Giocare via Internet

`avvia-online.bat` apre un tunnel pubblico verso il tuo PC, senza aprire porte del router:

1. **Cloudflare Quick Tunnel** (consigliato, gratuito, senza account). Installalo una volta sola:
   ```
   winget install Cloudflare.cloudflared
   ```
   Poi riavvia `avvia-online.bat`: comparirà un link tipo `https://parole-a-caso.trycloudflare.com`.
2. Se `cloudflared` non è installato viene usato **localtunnel** (incluso). Il sito loca.lt chiede agli amici una "password": è l'IP pubblico dell'host, che il gioco mostra nella lobby e nel terminale.
3. In alternativa: [Tailscale](https://tailscale.com) o ZeroTier (rete privata virtuale), oppure l'inoltro della porta 3000 sul router.

Il link pubblico cambia a ogni avvio. Il codice stanza protegge l'accesso.

## Come si gioca

- **Lobby**: ogni giocatore crea il proprio eroe (classe, aspetto, tratti casuali). Con meno di 4 giocatori se ne possono creare di più a testa. L'host assegna gli eroi e avvia la campagna, oppure carica un salvataggio.
- **Viaggio a giornate**: ogni giorno il gruppo tira la *Riserva del Cammino*, un d6 per eroe. Ogni giocatore assegna i propri dadi a Cammino, Foraggio, Vedetta o Ricerca; la specialità della classe dà +1. A fine giornata ogni eroe mangia una razione e la *Cenere Marea* avanza. Se arriva al 100% la partita è persa; i Fari la respingono.
- **Eventi e prove**: le scelte si votano (maggioranza, spareggio dell'host). Le prove sono d20 + modificatore contro una CD visibile. Le *Scintille del Fato*, una risorsa condivisa, permettono di ritirare i dadi.
- **Battaglie laterali**: due file (la fila avanti protegge quella dietro dalla mischia). Ogni nemico ha una *Guardia*: colpire le sue debolezze la riduce e a zero il nemico è *Spezzato*. Ci sono *Slancio* (carica fino a ×2,5), combinazioni elementali, *Concerti* tra eroi legati ed *Evocazioni* mitiche.
- **Crescita**: si sceglie un talento a ogni livello e una sottoclasse al livello 3. I *Cristalli* sbloccano mestieri secondari. Gli eroi stringono legami agli accampamenti, ricevono trasformazioni e cicatrici e invecchiano tra un atto e l'altro.
- **Campagna**: 3 atti con bivi. Le scelte influenzano fazioni, boss, alleati e finale. A fine Atto I le inclinazioni del gruppo aprono i *Sentieri Mitici*: Fiamma Ultima, Falena e Sale. Gli eroi sopravvissuti diventano *Leggende*, richiamabili nelle campagne successive.

- **Missioni**: il pannello 📜 a destra mostra la tappa attuale della storia, il boss dell'atto (bloccato finché non completate le tappe) e le missioni secondarie. Freccia e distanza indicano la direzione; cliccandole la visuale si sposta sul luogo.

**Comandi della mappa**: trascina per spostare la visuale, rotellina per lo zoom, WASD o frecce per scorrere, C o spazio per centrare la visuale sul gruppo.

## Salvataggi

- L'host salva dal menu ☰ → Partita. I file finiscono in `saves/*.json`.
- Il gioco salva da solo (`autosalvataggio.json`) quando si riposa alla locanda, ogni 5 giorni e a ogni capitolo.
- Per riprendere la partita: avvia il server, poi in lobby premi **Carica partita**. Gli eroi tornano ai giocatori che rientrano con lo stesso nome; quelli di chi è assente li gestisce l'host finché non torna.

## Architettura

```
server/      Node.js + Express + Socket.IO (server autoritativo)
  index.js     avvio, stanze, link LAN/Internet, socket
  game.js      stato della campagna, viaggio, eventi, città, capitoli, voti, salvataggi
  combat.js    battaglia a turni con file, guardia, slancio, stati, IA nemica
  mapgen.js    mappa esagonale procedurale per atto (percorso garantito)
  tunnel.js    tunnel pubblico (cloudflared → localtunnel)
shared/      regole e dati usati da server e client
  rules.js     formule, statistiche derivate, prove, esagoni
  data/        classi, abilità, oggetti, nemici, eventi, storia, mitici, lore
client/      ES modules senza bundler; three.js servito da node_modules
  js/render/   motore HD-2D (tilt-shift, bloom, color grading), pixel art procedurale,
               diorama esagonale, scena di battaglia, dadi 3D
  js/ui/       lobby, HUD, pannelli narrativi, scheda, comandi di battaglia
tests/       simulazioni headless di campagne complete (npm test)
```

Tutta la logica gira sul server con un RNG deterministico: i client inviano solo intenzioni e ricevono lo stato, quindi i giocatori restano sempre sincronizzati.
