// Fetches KuCoin's full ticker snapshot (all symbols, prices, 24h volume)
// server-side, so the browser never has to make this CORS-blocked call
// directly. Used by the frontend to discover which coins are tradable
// against both USDT and BTC (needed to form a triangle) and to rank
// them by volume so we only watch the most liquid ones.
exports.handler = async function () {
  try {
    const res = await fetch('https://api.kucoin.com/api/v1/market/allTickers');
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
