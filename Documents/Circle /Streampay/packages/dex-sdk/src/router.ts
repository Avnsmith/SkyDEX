import { ethers, Contract, Signer } from 'ethers';

// Minimal ABI for the ArcDEXRouter
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory)"
];

export class ArcDEXClient {
  private router: Contract;

  constructor(routerAddress: string, signerOrProvider: Signer | ethers.Provider) {
    this.router = new Contract(routerAddress, ROUTER_ABI, signerOrProvider);
  }

  async swapExactTokensForTokens(
    amountIn: bigint,
    amountOutMin: bigint,
    path: string[],
    to: string,
    deadline: number = Math.floor(Date.now() / 1000) + 1200 // 20 mins
  ) {
    // In production, an Agent Wallet will execute this. Here we build the transaction or execute directly.
    console.log(`[ArcDEXClient] Swapping ${amountIn} across path ${path.join('->')}...`);
    const tx = await this.router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      to,
      deadline
    );
    return tx.wait();
  }
}
