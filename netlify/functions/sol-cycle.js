const timeoutFetch=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{accept:'application/json','user-agent':'Mozilla/5.0'}});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return await r.json()}finally{clearTimeout(t)}};
const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:null};
exports.handler=async()=>{try{
 const [htxDepth,kuDepth,kuUsdc,htxSol]=await Promise.all([
  timeoutFetch('https://api.huobi.pro/market/depth?symbol=solusdt&type=step0&depth=20'),
  timeoutFetch('https://api.kucoin.com/api/v1/market/orderbook/level2_20?symbol=SOL-USDC'),
  timeoutFetch('https://api.kucoin.com/api/v3/currencies/USDC'),
  timeoutFetch('https://api.huobi.pro/v2/reference/currencies?currency=sol')
 ]);
 const hAsk=num(htxDepth?.tick?.asks?.[0]?.[0]);
 const kBid=num(kuDepth?.data?.bids?.[0]?.[0]);
 let usdcTrc20Fee=null,usdcTrc20Status=null;
 const chains=kuUsdc?.data?.chains||[];
 for(const ch of chains){const name=String(ch.chainName||ch.chainId||ch.chain||'').toLowerCase();if(name.includes('trx')||name.includes('tron')||name.includes('trc20')){usdcTrc20Fee=num(ch.withdrawalMinFee??ch.withdrawFeeRate);usdcTrc20Status=ch.isWithdrawEnabled===false?'disabled':'available';break}}
 let solWithdrawFee=null,solWithdrawStatus=null;
 const htxChains=htxSol?.data?.[0]?.chains||htxSol?.data?.chains||[];
 for(const ch of htxChains){const name=String(ch.chain||'').toLowerCase();if(name.includes('sol')){solWithdrawFee=num(ch.transactFeeWithdraw??ch.minTransactFeeWithdraw);solWithdrawStatus=ch.withdrawStatus||null;break}}
 if(!hAsk||!kBid)throw Error('Missing SOL market prices');
 return{statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({htxSolUsdtAsk:hAsk,kucoinSolUsdcBid:kBid,htxSolWithdrawFee:solWithdrawFee,htxSolWithdrawStatus:solWithdrawStatus,kucoinUsdcTrc20Fee:usdcTrc20Fee,kucoinUsdcTrc20Status:usdcTrc20Status,timestamp:Date.now()})};
}catch(e){return{statusCode:502,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'},body:JSON.stringify({error:e.message})}}
};