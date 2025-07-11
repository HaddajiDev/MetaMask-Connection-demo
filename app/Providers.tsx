"use client"

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './wagmi'
import { MetaMaskProvider } from '../providers/MetaMaskProvider'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <MetaMaskProvider>
            {children}
          </MetaMaskProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }