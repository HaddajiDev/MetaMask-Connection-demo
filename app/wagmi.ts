// app/wagmi.ts
import { http, createConfig } from 'wagmi'
import { mainnet, arbitrum } from 'wagmi/chains' // Add any chains you need

export const config = createConfig({
  chains: [mainnet, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
  },
})