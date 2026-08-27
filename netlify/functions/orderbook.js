const allowed = new Set(['binance','kucoin','htx','bybit']);
const timeoutFetch = async (url, ms=6000) => { const c=new AbortController(); const t=setTimeout(()=>c.abort(),ms); try { const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'Mozilla/5.0'}}); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return await r.json(); } finally { clearTimeout(t); } };
const num = v => { const n=Number(v); return Number.isFinite(n)&&n>0?n:null; };
const clean = levels => (Array.isArray(levels)?levels:[]).map(x=>[num(x[0]),num(x[1])]).filter(x=>x[0]&&x[1]).slice(0,50);
exports.handler = async (event) => {
  const exchange=String(event.queryStringParameters?.exchange||'').toLowerCase();
  const coin=String(event.queryStringParameters?.coin||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!allowed.has(exchange)||!coin) return {statusCode:400,body:JSON.stringify({error:'Invalid exchange or coin'})};
  try {
    let j,bids=[],asks=[],source='';
    if(exchange==='binance'){
      const urls=[`https://data-api.binance.vision/api/v3/depth?symbol=${coin}USDT&limit=50`,`https://api1.binance.com/api/v3/depth?symbol=${coin}USDT&limit=50`];
      let last; for(const u of urls){try{j=await timeoutFetch(u);source=u;break}catch(e){last=e}} if(!j)throw last||new Error('Binance depth unavailable'); bids=clean(j.bids);asks=clean(j.asks);
    } else if(exchange==='kucoin'){
      source=`https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=${coin}-USDT`; j=await timeoutFetch(source); bids=clean(j.data?.bids);asks=clean(j.data?.asks);
    } else if(exchange==='htx'){
      source=`https://api.huobi.pro/market/depth?symbol=${coin.toLowerCase()}usdt&type=step0&depth=20`; j=await timeoutFetch(source); bids=clean(j.tick?.bids);asks=clean(j.tick?.asks);
    } else {
      const urls=[`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${coin}USDT&limit=50`,`https://api.bytick.com/v5/market/orderbook?category=spot&symbol=${coin}USDT&limit=50`];
      let last; for(const u of urls){try{j=await timeoutFetch(u);source=u;break}catch(e){last=e}} if(!j)throw last||new Error('Bybit depth unavailable'); bids=clean(j.result?.b);asks=clean(j.result?.a);
    }
    if(!bids.length||!asks.length) throw new Error('No usable depth returned');
    return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({exchange,coin,bids,asks,source,timestamp:Date.now()})};
  } catch(e){ return {statusCode:502,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({exchange,coin,error:e.message})}; }
};