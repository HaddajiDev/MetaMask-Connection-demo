'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface MetaMaskContextType {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: string) => Promise<void>;
  addChain: (chainConfig: ChainConfig) => Promise<void>;
  sendTransaction: (params: TransactionParams) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
}

interface ChainConfig {
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

interface TransactionParams {
  to: string;
  from?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  data?: string;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

interface MetaMaskProviderProps {
  children: ReactNode;
}

export const NETWORKS = {
  ARBITRUM: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
};

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
        setChainId(currentChainId);
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask is not installed! Please install MetaMask to continue.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const currentChainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setChainId(currentChainId);
        setIsConnected(true);
        console.log('Connected to MetaMask:', accounts[0], 'Chain:', currentChainId);
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      if (error.code === 4001) {
        alert('Connection rejected by user');
      } else {
        alert('Failed to connect to MetaMask');
      }
    }
  };

  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    console.log('Disconnected from MetaMask');
  };

  const switchChain = async (targetChainId: string) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
      console.log('Switched to chain:', targetChainId);
    } catch (error: any) {
      console.error('Failed to switch chain:', error);
      if (error.code === 4902) {
        throw new Error('This network is not added to your MetaMask. Please add it first.');
      }
      throw error;
    }
  };

  const addChain = async (chainConfig: ChainConfig) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainConfig],
      });
      console.log('Added chain:', chainConfig.chainName);
    } catch (error: any) {
      console.error('Failed to add chain:', error);
      throw error;
    }
  };

  const sendTransaction = async (params: TransactionParams): Promise<string> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    if (!account) {
      throw new Error('No account connected');
    }

    try {
      const transactionHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          ...params,
        }],
      });
      console.log('Transaction sent:', transactionHash);
      return transactionHash;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not available');
    }

    if (!account) {
      throw new Error('No account connected');
    }

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, account],
      });
      console.log('Message signed:', signature);
      return signature;
    } catch (error: any) {
      console.error('Message signing failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          disconnect();
        }
      };

      const handleChainChanged = (newChainId: string) => {
        console.log('Chain changed to:', newChainId);
        setChainId(newChainId);

      };

      const handleDisconnect = (error: any) => {
        console.log('MetaMask disconnected:', error);
        disconnect();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, []);

  const value: MetaMaskContextType = {
    isConnected,
    account,
    chainId,
    connect,
    disconnect,
    switchChain,
    addChain,
    sendTransaction,
    signMessage,
  };

  return (
    <MetaMaskContext.Provider value={value}>
      {children}
    </MetaMaskContext.Provider>
  );
};

export const useMetaMask = (): MetaMaskContextType => {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
};

export const formatChainId = (chainId: string): number => {
  return parseInt(chainId, 16);
};

export const getNetworkName = (chainId: string): string => {
  const networks: { [key: string]: string } = {
    '0x1': 'Ethereum Mainnet',
    '0xa4b1': 'Arbitrum One',
    '0x89': 'Polygon',
    '0x38': 'BSC',
    '0xa': 'Optimism',
    '0x539': 'Local Development',
  };
  return networks[chainId] || `Unknown Network (${chainId})`;
};