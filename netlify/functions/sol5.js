const timeoutFetch=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}};
const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:null};
exports.handler=async()=>{const started=Date.now();const reqs={
 kucoin:timeoutFetch('https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=SOL-USDT'),
 htx:timeoutFetch('https://api.huobi.pro/market/detail/merged?symbol=solusdt'),
 okx:timeoutFetch('https://www.okx.com/api/v5/market/ticker?instId=SOL-USDT'),
 gate:timeoutFetch('https://api.gateio.ws/api/v4/spot/tickers?currency_pair=SOL_USDT'),
 mexc:timeoutFetch('https://api.mexc.com/api/v3/ticker/bookTicker?symbol=SOLUSDT')
};
 const keys=Object.keys(reqs),vals=await Promise.allSettled(Object.values(reqs)),exchanges={},status={},errors={};
 for(let i=0;i<keys.length;i++){const k=keys[i],r=vals[i];status[k]='error';if(r.status==='rejected'){errors[k]=r.reason?.message||'Unavailable';continue}try{const j=r.value;if(k==='kucoin'){exchanges[k]={bid:n(j.data?.bestBid),ask:n(j.data?.bestAsk)}}else if(k==='htx'){exchanges[k]={bid:n(j.tick?.bid?.[0]),ask:n(j.tick?.ask?.[0])}}else if(k==='okx'){exchanges[k]={bid:n(j.data?.[0]?.bidPx),ask:n(j.data?.[0]?.askPx)}}else if(k==='gate'){const t=Array.isArray(j)?j[0]:null;exchanges[k]={bid:n(t?.highest_bid),ask:n(t?.lowest_ask)}}else if(k==='mexc'){exchanges[k]={bid:n(j.bidPrice),ask:n(j.askPrice)}}if(exchanges[k]?.bid&&exchanges[k]?.ask)status[k]='ok';else errors[k]='No usable bid/ask'}catch(e){errors[k]=e.message}}
 return{statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({symbol:'SOL/USDT',exchanges,status,errors,timestamp:Date.now(),latencyMs:Date.now()-started})};
};