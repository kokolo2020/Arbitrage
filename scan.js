/* Arbitrage scanner logic. Pure functions, no network, no DOM. Detection only. */
(function (root) {
  var UNIVERSE = ['BTC','ETH','SOL','XRP','BNB','DOGE','ADA','TRX','LINK','AVAX','DOT','LTC','BCH','UNI','ATOM','NEAR','APT','ARB','OP','SUI','INJ','FIL','ETC','AAVE','MKR','XLM','HBAR','ICP','TON','SHIB','PEPE','SEI','TIA','RUNE','CRV','GRT','FET','RNDR','IMX','ENA'];
  var EXCHANGES = ['OKX','Binance','KuCoin'];
  function pair(b, q) { return b + '-' + q; }
  function ok(x) { return x && x.bid > 0 && x.ask > 0; }
  function cap(sz, px) { return sz > 0 && px > 0 ? sz * px : null; }
  function minKnown(a) { var v = a.filter(function (x) { return x !== null; }); return v.length ? Math.min.apply(null, v) : null; }

  /* Triangular on one exchange: USDT -> Q -> X -> USDT and the reverse, Q in BTC/ETH. */
  function triangular(ex, book, fee, universe) {
    var out = [], f = 1 - fee;
    ['BTC', 'ETH'].forEach(function (Q) {
      var qu = book[pair(Q, 'USDT')];
      if (!ok(qu)) return;
      universe.forEach(function (X) {
        if (X === Q) return;
        var xu = book[pair(X, 'USDT')], xq = book[pair(X, Q)];
        if (!ok(xu) || !ok(xq)) return;
        var gA = (1 / qu.ask) * (1 / xq.ask) * xu.bid;
        var gB = (1 / xu.ask) * xq.bid * qu.bid;
        out.push({ kind: 'tri', ex: ex, route: 'USDT>' + Q + '>' + X + '>USDT', gross: (gA - 1) * 100, net: (gA * f * f * f - 1) * 100,
          size: minKnown([cap(qu.askSz, qu.ask), cap(xq.askSz, xu.bid), cap(xu.bidSz, xu.bid)]) });
        out.push({ kind: 'tri', ex: ex, route: 'USDT>' + X + '>' + Q + '>USDT', gross: (gB - 1) * 100, net: (gB * f * f * f - 1) * 100,
          size: minKnown([cap(xu.askSz, xu.ask), cap(xq.bidSz, xu.ask), cap(qu.bidSz, qu.bid)]) });
      });
    });
    return out;
  }

  /* Cross-exchange spread: buy X at ask on A, sell X at bid on B. Needs balances on both sides; transfers not modelled. */
  function cross(books, fee, universe) {
    var out = [], f = 1 - fee;
    universe.forEach(function (X) {
      var best = null;
      EXCHANGES.forEach(function (a) {
        var ba = books[a] && books[a][pair(X, 'USDT')];
        if (!ok(ba)) return;
        EXCHANGES.forEach(function (b) {
          if (a === b) return;
          var bb = books[b] && books[b][pair(X, 'USDT')];
          if (!ok(bb)) return;
          var g = bb.bid / ba.ask;
          if (!best || g > best.g) best = { g: g, a: a, b: b, ba: ba, bb: bb };
        });
      });
      if (best) out.push({ kind: 'x', ex: best.a + ' > ' + best.b, route: 'buy ' + X + ' ' + best.a + ', sell ' + best.b,
        gross: (best.g - 1) * 100, net: (best.g * f * f - 1) * 100,
        size: minKnown([cap(best.ba.askSz, best.ba.ask), cap(best.bb.bidSz, best.bb.bid)]) });
    });
    return out;
  }

  /* Persistence tracker: how long does a positive-net opportunity stay positive? */
  function Tracker() { this.active = {}; this.events = []; this.polls = 0; this.evaluated = 0; this.positivePolls = 0; this.bestNet = -Infinity; this.bestRoute = ''; }
  Tracker.prototype.update = function (opps, intervalMs, now) {
    this.polls++; this.evaluated += opps.length;
    var seen = {}, self = this, anyPos = false;
    opps.forEach(function (o) {
      if (o.net > self.bestNet) { self.bestNet = o.net; self.bestRoute = o.ex + ' ' + o.route; }
      if (o.net > 0) {
        anyPos = true;
        var k = o.ex + '|' + o.route; seen[k] = true;
        var a = self.active[k];
        if (!a) a = self.active[k] = { ex: o.ex, route: o.route, kind: o.kind, start: now, polls: 0, peak: o.net, size: o.size };
        a.polls++; if (o.net > a.peak) { a.peak = o.net; a.size = o.size; }
      }
    });
    if (anyPos) this.positivePolls++;
    Object.keys(this.active).forEach(function (k) {
      if (!seen[k]) {
        var a = self.active[k]; delete self.active[k];
        self.events.push({ time: a.start, ex: a.ex, route: a.route, kind: a.kind, polls: a.polls, seconds: a.polls * intervalMs / 1000, peak: a.peak, size: a.size });
        if (self.events.length > 1000) self.events.shift();
      }
    });
  };

  var api = { UNIVERSE: UNIVERSE, EXCHANGES: EXCHANGES, triangular: triangular, cross: cross, Tracker: Tracker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Scan = api;
})(typeof window !== 'undefined' ? window : this);
