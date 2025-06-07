// providers/MetaMaskProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MetaMaskSDK } from '@metamask/sdk';
import { MetaMaskContextType, NetworkConfig, TransactionParameters, DappMetadata } from '../types/metamask';

const MetaMaskContext = createContext<MetaMaskContextType | null>(null);

interface MetaMaskProviderProps {
  children: ReactNode;
}

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({ children }) => {
  const [sdk, setSdk] = useState<MetaMaskSDK | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [chainId, setChainId] = useState<string | null>(null);

  useEffect(() => {
    const initSDK = async (): Promise<void> => {
      const dappMetadata: DappMetadata = {
        name: "Your App Name",
        url: typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
      };

      const MMSDK = new MetaMaskSDK({
        dappMetadata,
        infuraAPIKey: "98824a8e619642e79d0e2705c9180849",
      });

      await MMSDK.init();
      setSdk(MMSDK);

      try {
        const accounts = await MMSDK.getProvider()?.request({
          method: 'eth_accounts',
        }) as string[];
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          
          const currentChainId = await MMSDK.getProvider()?.request({
            method: 'eth_chainId',
          }) as string;
          setChainId(currentChainId);
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      }

      const provider = MMSDK.getProvider();
      if (provider) {
        provider.on('accountsChanged', (...args: unknown[]) => {
          const accounts = args[0] as string[];
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
          } else {
            setAccount(null);
            setIsConnected(false);
          }
        });

        provider.on('chainChanged', (...args: unknown[]) => {
          const chainId = args[0] as string;
          setChainId(chainId);
        });

        provider.on('disconnect', () => {
          setAccount(null);
          setIsConnected(false);
          setChainId(null);
        });
      }
    };

    initSDK().catch(console.error);
  }, []);

  const connect = async (): Promise<void> => {
    if (!sdk) {
      throw new Error('MetaMask SDK not initialized');
    }
    
    setIsConnecting(true);
    try {
      const accounts = await sdk.connect() as string[];
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        const currentChainId = await sdk.getProvider()?.request({
          method: 'eth_chainId',
        }) as string;
        setChainId(currentChainId);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    if (!sdk) return;
    
    try {
      await sdk.disconnect();
      setAccount(null);
      setIsConnected(false);
      setChainId(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  const switchNetwork = async (chainId: string): Promise<void> => {
    if (!sdk) {
      throw new Error('MetaMask SDK not initialized');
    }
    
    try {
      await sdk.getProvider()?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        const networkConfig = getNetworkConfig(chainId);
        if (networkConfig) {
          try {
            await sdk.getProvider()?.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
            throw new Error(`Failed to add network: ${addError instanceof Error ? addError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error(`Network configuration not found for chainId: ${chainId}`);
        }
      } else {
        console.error('Failed to switch network:', switchError);
        throw new Error(`Failed to switch network: ${switchError.message || 'Unknown error'}`);
      }
    }
  };

  const addNetwork = async (networkConfig: NetworkConfig): Promise<void> => {
    if (!sdk) {
      throw new Error('MetaMask SDK not initialized');
    }
    
    try {
      await sdk.getProvider()?.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
    } catch (error: any) {
      console.error('Failed to add network:', error);
      throw new Error(`Failed to add network: ${error.message || 'Unknown error'}`);
    }
  };

  const getNetworkConfig = (chainId: string): NetworkConfig | null => {
    const networks: Record<string, NetworkConfig> = {
      '0x1': {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://mainnet.infura.io/v3/'],
        blockExplorerUrls: ['https://etherscan.io/'],
      },
      '0x89': {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: {
          name: 'MATIC',
          symbol: 'MATIC',
          decimals: 18,
        },
        rpcUrls: ['https://polygon-rpc.com/'],
        blockExplorerUrls: ['https://polygonscan.com/'],
      },
      '0xa': {
        chainId: '0xa',
        chainName: 'Optimism',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://mainnet.optimism.io/'],
        blockExplorerUrls: ['https://optimistic.etherscan.io/'],
      },
      '0xa4b1': {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://arb1.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://arbiscan.io/'],
      },
      '0x38': {
        chainId: '0x38',
        chainName: 'BNB Smart Chain',
        nativeCurrency: {
          name: 'BNB',
          symbol: 'BNB',
          decimals: 18,
        },
        rpcUrls: ['https://bsc-dataseed1.binance.org/'],
        blockExplorerUrls: ['https://bscscan.com/'],
      },
      '0xaa36a7': {
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: ['https://sepolia.infura.io/v3/'],
        blockExplorerUrls: ['https://sepolia.etherscan.io/'],
      },
    };
    
    return networks[chainId] || null;
  };

  const sendTransaction = async (transactionParameters: TransactionParameters): Promise<string> => {
    if (!sdk) {
      throw new Error('MetaMask SDK not initialized');
    }
    
    try {
      const txHash = await sdk.getProvider()?.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      }) as string;
      return txHash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!sdk || !account) {
      throw new Error('MetaMask SDK not initialized or no account connected');
    }
    
    try {
      const signature = await sdk.getProvider()?.request({
        method: 'personal_sign',
        params: [message, account],
      }) as string;
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  };

  const value: MetaMaskContextType = {
    sdk,
    account,
    isConnected,
    isConnecting,
    chainId,
    connect,
    disconnect,
    switchNetwork,
    addNetwork,
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
  if (!context) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
};