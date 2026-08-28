const COINS=['SOL','XRP','TRX','XLM','LTC','AVAX','LINK','ADA','DOGE','ETH'];
const timeoutFetch=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}};
const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:null};
exports.handler=async()=>{const started=Date.now();const reqs={
 kucoin:timeoutFetch('https://api.kucoin.com/api/v1/market/allTickers'),
 htx:timeoutFetch('https://api.huobi.pro/market/tickers'),
 okx:timeoutFetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT'),
 gate:timeoutFetch('https://api.gateio.ws/api/v4/spot/tickers'),
 mexc:timeoutFetch('https://api.mexc.com/api/v3/ticker/bookTicker')
};
const keys=Object.keys(reqs),vals=await Promise.allSettled(Object.values(reqs)),exchanges={},status={},errors={};for(const k of keys){exchanges[k]={};status[k]='error'}
for(let i=0;i<keys.length;i++){const k=keys[i],r=vals[i];if(r.status==='rejected'){errors[k]=r.reason?.message||'Unavailable';continue}try{const j=r.value;if(k==='kucoin'){const m=new Map((j.data?.ticker||[]).map(t=>[t.symbol,t]));for(const c of COINS){const t=m.get(`${c}-USDT`);if(t)exchanges[k][c]={bid:n(t.buy),ask:n(t.sell)}}}
else if(k==='htx'){const m=new Map((j.data||[]).map(t=>[String(t.symbol||'').toUpperCase(),t]));for(const c of COINS){const t=m.get(`${c}USDT`);if(t)exchanges[k][c]={bid:n(t.bid),ask:n(t.ask)}}}
else if(k==='okx'){const m=new Map((j.data||[]).map(t=>[t.instId,t]));for(const c of COINS){const t=m.get(`${c}-USDT`);if(t)exchanges[k][c]={bid:n(t.bidPx),ask:n(t.askPx)}}}
else if(k==='gate'){const m=new Map((Array.isArray(j)?j:[]).map(t=>[t.currency_pair,t]));for(const c of COINS){const t=m.get(`${c}_USDT`);if(t)exchanges[k][c]={bid:n(t.highest_bid),ask:n(t.lowest_ask)}}}
else if(k==='mexc'){const m=new Map((Array.isArray(j)?j:[]).map(t=>[t.symbol,t]));for(const c of COINS){const t=m.get(`${c}USDT`);if(t)exchanges[k][c]={bid:n(t.bidPrice),ask:n(t.askPrice)}}}
status[k]=Object.keys(exchanges[k]).length?'ok':'error';if(status[k]!=='ok')errors[k]='No supported markets';}catch(e){errors[k]=e.message}}
return{statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({coins:COINS,exchanges,status,errors,timestamp:Date.now(),latencyMs:Date.now()-started})};};