// Fallback only — Binance's public REST endpoints usually allow direct
// browser access (unlike KuCoin's). This exists in case that ever changes
// or is region-blocked.
exports.handler = async function () {
  try {
    const [exInfoRes, tickerRes] = await Promise.all([
      fetch('https://api.binance.com/api/v3/exchangeInfo'),
      fetch('https://api.binance.com/api/v3/ticker/24hr'),
    ]);
    const exInfo = await exInfoRes.json();
    const tickers = await tickerRes.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: exInfo.symbols, tickers }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
