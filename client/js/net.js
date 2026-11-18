// Connessione Socket.IO con riconnessione e token persistente
/* global io */
export class Net {
  constructor() {
    this.socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
    this.listeners = {};
    this.ping = 0;
    this.socket.on('state', (s) => this.emit('state', s));
    this.socket.on('connect', () => { this.emit('connect'); if (this.helloMsg) this.hello(this.helloMsg); });
    this.socket.on('disconnect', () => this.emit('disconnect'));
    setInterval(() => {
      if (!this.socket.connected) return;
      const t = performance.now();
      this.socket.emit('ping_check', t, () => { this.ping = Math.round(performance.now() - t); this.emit('ping', this.ping); });
    }, 3000);
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { for (const f of this.listeners[ev] || []) f(...a); }
  hello(msg) {
    this.helloMsg = msg;
    return new Promise((res) => this.socket.emit('hello', msg, (r) => {
      if (r?.ok) { try { sessionStorage.setItem('vael_token', r.token); } catch {} this.me = r; this.helloMsg = { ...msg, token: r.token }; }
      res(r);
    }));
  }
  send(action) {
    return new Promise((res) => {
      if (!this.socket.connected) return res({ ok: false, error: 'Connessione persa, riconnessione in corso...' });
      this.socket.timeout(8000).emit('action', action, (err, r) => res(err ? { ok: false, error: 'Il server non risponde' } : r));
    });
  }
  call(name) { return new Promise((res) => this.socket.emit(name, null, (r) => res(r))); }
  chat(text) { this.socket.emit('chat', text); }
}
