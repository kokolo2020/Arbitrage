# Arbitrage Scanner (detection only)

One static page. Open `index.html` (GitHub Pages) and press Start. It reads public price feeds from OKX, Binance and KuCoin in your browser, scores triangular and cross-exchange routes after fees, and logs how long any positive route lasts. No API keys, no orders, no server, no Netlify.

Files: `index.html` (page), `scan.js` (logic), `test.js` (`node test.js` runs unit tests on synthetic books).
Limits: top of book only, fee is one flat number, cross-exchange ignores transfers and feed timing.
