// Fallback only — OKX's public REST endpoints usually allow direct
// browser access. This exists in case that's ever blocked.
exports.handler = async function () {
  try {
    const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
