import { Contract, ethers } from 'ethers';

const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory)"
];

export class QuotingEngine {
  private router: Contract;

  constructor(routerAddress: string, provider: ethers.Provider) {
    this.router = new Contract(routerAddress, ROUTER_ABI, provider);
  }

  async getQuote(amountIn: bigint, path: string[]): Promise<bigint> {
    const amounts = await this.router.getAmountsOut(amountIn, path);
    // The last element is the expected output
    return amounts[amounts.length - 1];
  }

  calculateSlippage(expectedOut: bigint, slippageBps: number): bigint {
    // slippageBps = 50 means 0.5%
    const slippageAmount = (expectedOut * BigInt(slippageBps)) / 10000n;
    return expectedOut - slippageAmount;
  }
}
