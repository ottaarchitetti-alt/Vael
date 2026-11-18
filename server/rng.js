// RNG deterministico e serializzabile (mulberry32)
export class RNG {
  constructor(seed) { this.s = seed >>> 0; }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  d(n) { return this.int(1, n); }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  weighted(entries) { // [[val, w], ...]
    const tot = entries.reduce((s, e) => s + e[1], 0);
    let r = this.next() * tot;
    for (const [v, w] of entries) { if ((r -= w) <= 0) return v; }
    return entries[entries.length - 1][0];
  }
}
