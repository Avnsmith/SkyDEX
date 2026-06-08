import { ethers } from 'ethers';

// Format USDC amounts (6 decimals for Circle rules on Arc)
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}

export function formatUSDC(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}
