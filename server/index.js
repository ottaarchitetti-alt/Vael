// Ceneri di Vael — server host (Express + Socket.IO, autoritativo)
import express from 'express';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Game } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
let PORT = Number(process.env.PORT) || 3000;
const FIRST_PORT = PORT;
const WANT_TUNNEL = process.argv.includes('--tunnel');
const OPEN_BROWSER = !process.argv.includes('--no-open');

// Chiave host: solo chi apre l'URL con ?host=KEY diventa host.
const HOST_KEY = crypto.randomBytes(6).toString('hex');
const ROOM_CODE = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[crypto.randomInt(24)]).join('');

const app = express();
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules/three')));
app.use('/shared', express.static(path.join(ROOT, 'shared')));
app.use(express.static(path.join(ROOT, 'client')));

const net = { lan: [], publicUrl: null, tunnelInfo: null, tunnelState: WANT_TUNNEL ? 'starting' : 'off' };
app.get('/api/invite', (_req, res) => res.json({ code: ROOM_CODE, port: PORT, ...net }));

const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 25000, maxHttpBufferSize: 1e6 });

const game = new Game(broadcast);
const socketsByPlayer = new Map();

function broadcast() {
  const players = Object.values(game.players).map(({ token, ...p }) => p);
  io.to('game').emit('state', { players, game: game.view(), code: ROOM_CODE });
}

io.on('connection', (socket) => {
  let player = null;
  socket.on('hello', (msg = {}, ack) => {
    const isHost = msg.hostKey === HOST_KEY;
    const known = msg.token && Object.values(game.players).find((p) => p.token === msg.token);
    if (!isHost && !known && String(msg.code || '').toUpperCase() !== ROOM_CODE) return ack?.({ ok: false, error: 'Codice stanza errato' });
    if (!isHost && !known && game.mode === 'local') return ack?.({ ok: false, error: "L'host sta giocando una campagna locale: chiedigli di scegliere «Campagna online» per farti entrare." });
    if (!isHost && !known && Object.values(game.players).filter((p) => p.connected).length >= 6) return ack?.({ ok: false, error: 'Stanza piena' });
    player = game.addPlayer({ name: String(msg.name || '').trim(), token: msg.token, isHost: isHost || known?.isHost });
    socketsByPlayer.set(player.id, socket);
    socket.join('game');
    ack?.({ ok: true, playerId: player.id, token: player.token, isHost: player.isHost });
    broadcast();
  });
  socket.on('action', (a, ack) => {
    if (!player) return ack?.({ ok: false, error: 'Non connesso' });
    try {
      game.handle(player, a);
      ack?.({ ok: true });
    } catch (e) {
      if (typeof e !== 'string') console.error(e);
      ack?.({ ok: false, error: typeof e === 'string' ? e : 'Errore interno: ' + e.message });
    }
  });
  socket.on('saves', (_m, ack) => { try { ack?.({ ok: true, saves: game.listSaves() }); } catch (e) { ack?.({ ok: false, error: e.message }); } });
  socket.on('legends', (_m, ack) => ack?.({ ok: true, legends: game.legends() }));
  socket.on('chat', (text) => {
    if (!player || !text) return;
    game.log(`${player.name}: ${String(text).slice(0, 240)}`, 'chat');
    game.changed();
  });
  socket.on('ping_check', (t, ack) => ack?.(t));
  socket.on('disconnect', () => {
    if (player && socketsByPlayer.get(player.id) === socket) { socketsByPlayer.delete(player.id); game.disconnect(player.id); }
  });
});

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${PORT}`);
}

// se la porta è occupata (es. un'altra finestra del gioco aperta) prova le successive
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && PORT < FIRST_PORT + 10) {
    console.log(`  Porta ${PORT} occupata, provo la ${PORT + 1}...`);
    PORT++;
    setTimeout(() => server.listen(PORT), 100);
  } else {
    console.error('  Impossibile avviare il server:', e.message);
    process.exit(1);
  }
});

server.listen(PORT);
server.once('listening', async () => {
  net.lan = lanAddresses();
  const hostUrl = `http://localhost:${PORT}/?host=${HOST_KEY}`;
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║          CENERI DI VAEL              ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log(`  Host (apri tu questo):  ${hostUrl}`);
  console.log(`  Codice stanza:          ${ROOM_CODE}`);
  net.lan.forEach((u) => console.log(`  LAN:                    ${u}/?code=${ROOM_CODE}`));
  if (OPEN_BROWSER) {
    const cmd = process.platform === 'win32' ? `start "" "${hostUrl}"` : process.platform === 'darwin' ? `open "${hostUrl}"` : `xdg-open "${hostUrl}"`;
    exec(cmd, () => {});
  }
  if (WANT_TUNNEL) {
    console.log('  Avvio del tunnel Internet...');
    try {
      const { startTunnel } = await import('./tunnel.js');
      const t = await startTunnel(PORT);
      net.publicUrl = t.url; net.tunnelInfo = t.info; net.tunnelState = 'on';
      console.log(`  INTERNET (manda questo agli amici): ${t.url}/?code=${ROOM_CODE}`);
      if (t.info) console.log(`  ${t.info}`);
    } catch (e) {
      net.tunnelState = 'error'; net.tunnelInfo = e.message;
      console.log('  Tunnel non disponibile:', e.message);
    }
    broadcast();
  } else {
    console.log('  (Per giocare via Internet avvia con: npm run host)');
  }
});
