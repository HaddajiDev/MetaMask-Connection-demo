// chains/hyperliquid.ts
import { defineChain } from 'viem';

export const hyperliquid = defineChain({
  id: 999, // HyperLiquid Mainnet Chain ID
  name: 'HyperLiquid L1',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 }, // HyperLiquid uses USDC
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid.xyz/evm'], // HyperLiquid Mainnet RPC
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperLiquid Explorer',
      url: 'https://explorer.hyperliquid.xyz/', // Official explorer (if available, adjust as needed)
    },
  },
});