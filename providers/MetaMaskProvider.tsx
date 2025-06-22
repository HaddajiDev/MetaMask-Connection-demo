'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MetaMaskContextType {
  isConnected: boolean;
  account: string | null;
  chainId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: string) => Promise<void>;
  addChain: (chainConfig: any) => Promise<void>;
}

const MetaMaskContext = createContext<MetaMaskContextType | undefined>(undefined);

interface MetaMaskProviderProps {
  children: ReactNode;
}

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
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const currentChainId = await window.ethereum.request({ 
          method: 'eth_chainId' 
        });
        
        setAccount(accounts[0]);
        setChainId(currentChainId);
        setIsConnected(true);
      } catch (error) {
        console.error('Connection failed:', error);
      }
    } else {
      alert('MetaMask is not installed!');
    }
  };

  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
  };

  const switchChain = async (targetChainId: string) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      } catch (error: any) {
        console.error('Failed to switch chain:', error);
        throw error;
      }
    }
  };

  const addChain = async (chainConfig: any) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainConfig],
        });
      } catch (error: any) {
        console.error('Failed to add chain:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          disconnect();
        }
      };

      const handleChainChanged = (newChainId: string) => {
        setChainId(newChainId);
        console.log('Chain changed to:', newChainId);
      };

      const handleDisconnect = () => {
        disconnect();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        if (window.ethereum.removeListener) {
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