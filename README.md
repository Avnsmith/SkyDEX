# SkyDEX

A lightweight, plain‑HTML/CSS/JS decentralized exchange (DEX) for the **Arc testnet**.

## Features
- Sky‑blue gradient background with glass‑morphism UI
- Custom SkyDEX logo
- Real wallet integration using an Arc‑compatible MetaMask‑style wallet
- Token swap flow (quote + transaction) via public Arc testnet RPC endpoints
- Deployable as a static site on Vercel (no build step required)

## Local Development
1. Clone the repo (or download the files).
2. Open `index.html` in a browser (or serve the directory with a simple HTTP server, e.g. `python -m http.server`).
3. Connect your Arc testnet wallet (MetaMask with the Arc testnet network added).
4. Select tokens, enter an amount, and click **Swap**.

## Deployment
The project can be deployed to Vercel directly from the GitHub repository:
```bash
vercel --prod
```
Or use the Vercel dashboard → *Import Project* → select the GitHub repo.

## License
MIT © 2026 SkyDEX authors
