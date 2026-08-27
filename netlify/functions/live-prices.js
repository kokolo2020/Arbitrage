const COINS = ['BTC','ETH','BNB','XRP','SOL','TRX','DOGE','ADA','BCH','LINK','AVAX','XLM','SUI','HBAR','LTC','DOT','UNI','AAVE','NEAR','ETC'];

const timeoutFetch = async (url, ms = 7000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const firstSuccess = async urls => {
  const errors = [];
  for (const url of urls) {
    try {
      return { data: await timeoutFetch(url), source: url };
    } catch (e) {
      errors.push(`${url}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' | '));
};

const n = value => {
  const x = Number(value);
  return Number.isFinite(x) && x > 0 ? x : null;
};

exports.handler = async () => {
  const started = Date.now();

  const requests = [
    firstSuccess([
      'https://data-api.binance.vision/api/v3/ticker/bookTicker',
      'https://api1.binance.com/api/v3/ticker/bookTicker',
      'https://api-gcp.binance.com/api/v3/ticker/bookTicker',
      'https://api.binance.com/api/v3/ticker/bookTicker'
    ]),
    firstSuccess(['https://api.kucoin.com/api/v1/market/allTickers']),
    firstSuccess([
      'https://api.huobi.pro/market/tickers',
      'https://api-aws.huobi.pro/market/tickers'
    ])
  ];

  const results = await Promise.allSettled(requests);
  const exchanges = { binance: {}, kucoin: {}, htx: {} };
  const status = { binance: 'error', kucoin: 'error', htx: 'error' };
  const errors = {};
  const sources = {};

  if (results[0].status === 'fulfilled' && Array.isArray(results[0].value.data)) {
    const map = new Map(results[0].value.data.map(t => [t.symbol, t]));
    for (const coin of COINS) {
      const t = map.get(`${coin}USDT`);
      if (t) exchanges.binance[coin] = { bid: n(t.bidPrice), ask: n(t.askPrice) };
    }
    status.binance = Object.keys(exchanges.binance).length ? 'ok' : 'error';
    sources.binance = results[0].value.source;
    if (status.binance !== 'ok') errors.binance = 'No requested USDT markets returned';
  } else {
    errors.binance = results[0].reason?.message || 'Unavailable';
  }

  if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.data?.data?.ticker)) {
    const map = new Map(results[1].value.data.data.ticker.map(t => [t.symbol, t]));
    for (const coin of COINS) {
      const t = map.get(`${coin}-USDT`);
      if (t) exchanges.kucoin[coin] = { bid: n(t.buy), ask: n(t.sell) };
    }
    status.kucoin = Object.keys(exchanges.kucoin).length ? 'ok' : 'error';
    sources.kucoin = results[1].value.source;
  } else {
    errors.kucoin = results[1].reason?.message || 'Unavailable';
  }

  if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data?.data)) {
    const map = new Map(results[2].value.data.data.map(t => [String(t.symbol || '').toUpperCase(), t]));
    for (const coin of COINS) {
      const t = map.get(`${coin}USDT`);
      if (t) exchanges.htx[coin] = { bid: n(t.bid), ask: n(t.ask) };
    }
    status.htx = Object.keys(exchanges.htx).length ? 'ok' : 'error';
    sources.htx = results[2].value.source;
  } else {
    errors.htx = results[2].reason?.message || 'Unavailable';
  }

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'access-control-allow-origin': '*'
    },
    body: JSON.stringify({
      coins: COINS,
      exchanges,
      status,
      errors,
      sources,
      timestamp: Date.now(),
      latencyMs: Date.now() - started
    })
  };
};
