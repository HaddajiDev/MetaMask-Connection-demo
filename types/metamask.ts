// types/metamask.ts
import { MetaMaskSDK } from '@metamask/sdk';

export interface NetworkConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}

export interface PredefinedNetwork {
  chainId: string;
  name: string;
  config: NetworkConfig;
}

export interface MetaMaskError {
  code: number;
  message: string;
}

export interface TransactionParameters {
  to: string;
  from: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  data?: string;
}

export interface MetaMaskContextType {
  sdk: MetaMaskSDK | null;
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: (chainId: string) => Promise<void>;
  addNetwork: (networkConfig: NetworkConfig) => Promise<void>;
  sendTransaction: (transactionParameters: TransactionParameters) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

export interface DappMetadata {
  name: string;
  url: string;
  iconUrl?: string;
  description?: string;
}