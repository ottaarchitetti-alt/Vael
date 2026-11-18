# Sprite PNG personalizzati

I personaggi sono marionette: ogni pezzo (testa, busto, braccia, gambe, arma…) è generato dal codice
(`client/js/render/rigparts.js`). Puoi sostituire qualsiasi pezzo con un PNG disegnato a mano.

1. Metti i PNG in questa cartella (anche in sottocartelle).
2. Crea `manifest.json` che collega ogni pezzo al suo file:

```json
{
  "hero/lama/head": "hero/lama/head.png",
  "hero/lama/weapon": "hero/lama/spada.png",
  "enemy/lupo_bruma/head": "enemy/lupo/testa.png"
}
```

Regole:

- Il pezzo va disegnato **rivolto a sinistra**, su sfondo trasparente.
- Le armi vanno disegnate con la lama **verso il basso** a partire dall'impugnatura.
- Il punto di rotazione viene riscalato in proporzione dalla misura originale del pezzo,
  quindi conviene mantenere le stesse proporzioni (o multipli, es. 2× o 3×).

Chiavi degli eroi: `hero/<classe>/<pezzo>`, con classe tra `lama`, `ombra`, `arcanista`, `custode`,
`cantore`, `cacciatrice` e pezzo tra `head`, `hairTail`, `torso`, `skirt`, `cloak`, `armUpper`,
`armLower`, `armBack`, `legFront`, `legBack`, `weapon`, `weaponTense` (arco teso).

Chiavi dei nemici: `enemy/<id nemico>/<pezzo>` (gli id sono in `shared/data/enemies.js`).
I nemici umanoidi usano gli stessi pezzi degli eroi; le bestie usano `body`, `head`, `leg`, `tail`
(il granchio `claw` al posto di `head`); le creature volanti `body`, `head`, `wing` (lo spettro `arm`);
le melme solo `body`.
