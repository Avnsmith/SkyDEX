"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, fallback, useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "../config/chains";
import { ReactNode, useEffect } from "react";

const queryClient = new QueryClient();

// Add fallback RPCs for Arc Testnet (chain 5042002) for stability
export const config = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: fallback([
      http("https://rpc.testnet.arc.network"),
      http()
    ]),
  },
});

function AutoSwitchNetwork() {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (chain && chain.id !== arcTestnet.id && switchChain) {
      switchChain({ chainId: arcTestnet.id });
    }
  }, [chain, switchChain]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AutoSwitchNetwork />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
