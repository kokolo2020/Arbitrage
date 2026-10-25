const S = require('./scan.js'); const assert = require('assert');
const P = (bid, ask, bs = 10, as = 10) => ({ bid, ask, bidSz: bs, askSz: as });
// fair book: no arbitrage (zero spread): BTC 100000, ETH 5000 (ETH-BTC 0.05), SOL 200 (SOL-BTC 0.002)
const fair = { 'BTC-USDT': P(100000, 100000), 'ETH-USDT': P(5000, 5000), 'ETH-BTC': P(0.05, 0.05), 'SOL-USDT': P(200, 200), 'SOL-BTC': P(0.002, 0.002) };
let r = S.triangular('T', fair, 0, S.UNIVERSE);
assert(r.length > 0); r.forEach(o => assert(Math.abs(o.gross) < 1e-9, 'fair gross ' + o.gross));
// fees make every fair cycle lose ~0.3%
r = S.triangular('T', fair, 0.001, S.UNIVERSE); r.forEach(o => assert(o.net < -0.29 && o.net > -0.31, 'fee loss ' + o.net));
// plant a mispricing: SOL-BTC bid 2% high -> route USDT>SOL>BTC>USDT gains ~2% gross
const bad = Object.assign({}, fair, { 'SOL-BTC': P(0.00204, 0.00204) });
r = S.triangular('T', bad, 0, S.UNIVERSE).filter(o => o.route === 'USDT>SOL>BTC>USDT');
assert(r.length === 1 && Math.abs(r[0].gross - 2) < 0.01, 'planted ' + JSON.stringify(r));
// size: min of known caps
assert(r[0].size > 0);
// cross: A ask 100, B bid 101 -> gross 1%, net after 0.1% x2 ~ 0.7998%
const books = { OKX: { 'SOL-USDT': P(99.9, 100) }, Binance: { 'SOL-USDT': P(101, 101.1) }, KuCoin: {} };
let c = S.cross(books, 0.001, ['SOL']);
assert(c.length === 1 && c[0].ex === 'OKX > Binance' && Math.abs(c[0].gross - 1) < 1e-9 && Math.abs(c[0].net - 0.7998) < 0.01, JSON.stringify(c));
// missing/zero quotes are ignored
assert(S.cross({ OKX: { 'SOL-USDT': P(0, 0) }, Binance: {}, KuCoin: {} }, 0.001, ['SOL']).length === 0);
// tracker: positive for 3 polls then closes
const t = new S.Tracker();
for (let i = 0; i < 3; i++) t.update([{ kind: 'x', ex: 'A > B', route: 'r', net: 0.5, gross: 0.7, size: 100 }], 3000, i);
t.update([{ kind: 'x', ex: 'A > B', route: 'r', net: -0.1, gross: 0.1, size: 100 }], 3000, 3);
assert(t.events.length === 1 && t.events[0].polls === 3 && t.events[0].seconds === 9 && t.positivePolls === 3 && t.polls === 4);
console.log('all tests passed');
