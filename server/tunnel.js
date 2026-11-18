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

async function tryLocaltunnel(port) {
  const { default: localtunnel } = await import('localtunnel');
  const tunnel = await localtunnel({ port });
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
