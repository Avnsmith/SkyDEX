"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { arcTestnet } from "../config/chains";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Add fallback RPCs for Arc Testnet (chain 5042002) for stability
export const config = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: fallback([
      http("https://rpc.testnet.arc.network"),
      // Include any alternative RPCs here if available, else rely on wagmi auto-retry
      http()
    ]),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/* We would wrap CircleAppKitProvider here with apiKey if needed */}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
