// app.js – plain JS for SkyDEX (Arc testnet integration)

const STATUS_EL = document.getElementById('status');
const CONNECT_BTN = document.getElementById('connectBtn');
const SWAP_BTN = document.getElementById('swapBtn');
const SELL_TOKEN_SELECT = document.getElementById('sellToken');
const BUY_TOKEN_SELECT = document.getElementById('buyToken');
const SELL_AMOUNT_INPUT = document.getElementById('sellAmount');
const BUY_AMOUNT_INPUT = document.getElementById('buyAmount');

let provider = null;
let signer = null;
let userAddress = null;

// Public Arc testnet RPC endpoint (replace with official if known)
const ARC_RPC_URL = 'https://testnet.arc.io/rpc'; // placeholder – actual endpoint may differ

async function log(message) {
  STATUS_EL.textContent += `${message}\n`;
}

async function connectWallet() {
  if (window.ethereum) {
    try {
      provider = window.ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      userAddress = accounts[0];
      await log(`Connected: ${userAddress}`);
      CONNECT_BTN.textContent = 'Wallet Connected';
      CONNECT_BTN.disabled = true;
      SWAP_BTN.disabled = false;
      await loadTokens();
    } catch (err) {
      await log('Wallet connection failed: ' + err.message);
    }
  } else {
    await log('No compatible wallet found. Please install MetaMask or Arc Wallet.');
  }
}

// Simple token list – in a real app you would query the Arc testnet for supported tokens
const SAMPLE_TOKENS = [
  { symbol: 'ARC', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDC', address: '0x1111111111111111111111111111111111111111' },
  { symbol: 'DAI', address: '0x2222222222222222222222222222222222222222' },
];

async function loadTokens() {
  SAMPLE_TOKENS.forEach(t => {
    const opt1 = document.createElement('option');
    opt1.value = t.address; opt1.textContent = t.symbol; SELL_TOKEN_SELECT.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = t.address; opt2.textContent = t.symbol; BUY_TOKEN_SELECT.appendChild(opt2);
  });
}

async function getQuote(sellToken, buyToken, amount) {
  // Placeholder: in a real DEX you would call the Arc swap quote endpoint.
  // Here we just simulate a 1:1 rate for demo.
  return amount; // return estimated amount
}

SELL_AMOUNT_INPUT.addEventListener('input', async () => {
  const sellToken = SELL_TOKEN_SELECT.value;
  const buyToken = BUY_TOKEN_SELECT.value;
  const amount = parseFloat(SELL_AMOUNT_INPUT.value);
  if (sellToken && buyToken && amount > 0) {
    const quote = await getQuote(sellToken, buyToken, amount);
    BUY_AMOUNT_INPUT.value = quote;
  } else {
    BUY_AMOUNT_INPUT.value = '';
  }
});

SWAP_BTN.addEventListener('click', async () => {
  const sellToken = SELL_TOKEN_SELECT.value;
  const buyToken = BUY_TOKEN_SELECT.value;
  const amount = parseFloat(SELL_AMOUNT_INPUT.value);
  if (!sellToken || !buyToken || !amount) {
    await log('Please fill all fields before swapping.');
    return;
  }
  try {
    await log('Preparing transaction...');
    // Build a simple transaction payload – actual method and contract address depend on Arc DEX contract.
    const tx = {
      from: userAddress,
      to: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', // placeholder DEX contract
      data: '0x', // placeholder calldata
      value: '0x0',
    };
    const txHash = await provider.request({ method: 'eth_sendTransaction', params: [tx] });
    await log('Transaction sent, hash: ' + txHash);
  } catch (e) {
    await log('Swap failed: ' + e.message);
  }
});

CONNECT_BTN.addEventListener('click', connectWallet);
