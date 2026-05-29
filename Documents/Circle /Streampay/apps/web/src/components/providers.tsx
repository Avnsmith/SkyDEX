"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arcTestnet } from "../config/chains";
import { ReactNode } from "react";

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
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
