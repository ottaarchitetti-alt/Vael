// Tunnel pubblico: Cloudflare Quick Tunnel (consigliato) → fallback localtunnel
import { spawn } from 'node:child_process';

function tryCloudflared(port) {
  return new Promise((resolve, reject) => {
    let proc;
    try {
      proc = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`]);
    } catch (e) { return reject(e); }
    const timer = setTimeout(() => reject(new Error('cloudflared: timeout')), 30000);
    const onData = (buf) => {
      const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) { clearTimeout(timer); resolve({ url: m[0], info: 'via Cloudflare Quick Tunnel' }); }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
    process.on('exit', () => proc.kill());
  });
}

// Compatibile con localtunnel 1.x e 2.x: entrambe accettano (porta, opzioni, callback).
// Il server predefinito della 1.x (localtunnel.me) non esiste più: si usa loca.lt.
async function tryLocaltunnel(port) {
  const mod = await import('localtunnel');
  const localtunnel = mod.default || mod;
  const tunnel = await new Promise((resolve, reject) => {
    let done = false;
    const finish = (err, t) => { if (done) return; done = true; clearTimeout(timer); if (err) reject(err); else resolve(t); };
    const timer = setTimeout(() => finish(new Error('localtunnel non risponde (timeout)')), 25000);
    try {
      const r = localtunnel(Number(port), { host: 'https://loca.lt' }, finish);
      if (r && typeof r.then === 'function') r.then((t) => finish(null, t), finish);
    } catch (e) { finish(e); }
  });
  if (!tunnel?.url) { try { tunnel?.close(); } catch {} throw new Error('localtunnel non ha restituito un indirizzo'); }
  // un errore del tunnel non deve far cadere il server di gioco
  tunnel.on?.('error', (e) => console.log('  Tunnel interrotto:', e.message || e));
  let pwd = '';
  try { pwd = (await (await fetch('https://loca.lt/mytunnelpassword')).text()).trim(); } catch {}
  return { url: tunnel.url, info: pwd ? `Password richiesta da loca.lt: ${pwd}` : 'via localtunnel' };
}

export async function startTunnel(port) {
  try { return await tryCloudflared(port); }
  catch {
    console.log('cloudflared non trovato (installa con: winget install Cloudflare.cloudflared). Provo localtunnel...');
    return await tryLocaltunnel(port);
  }
}
