// components/WalletConnection.tsx
'use client';

import { useState } from 'react';
import { useMetaMask } from '../providers/MetaMaskProvider';
import { TransactionParameters } from '../types/metamask';

const WalletConnection: React.FC = () => {
  const {
    account,
    isConnected,
    isConnecting,
    chainId,
    connect,
    disconnect,
    switchNetwork,
    signMessage,
    sendTransaction,
  } = useMetaMask();

  const [message, setMessage] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleConnect = async (): Promise<void> => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect to MetaMask');
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    try {
      await disconnect();
      setSignature('');
      setTxHash('');
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  };

  const handleSignMessage = async (): Promise<void> => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    try {
      const sig = await signMessage(message);
      setSignature(sig);
    } catch (error) {
      console.error('Signing failed:', error);
      alert('Failed to sign message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async (): Promise<void> => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      const txParams: TransactionParameters = {
        to: '0x742d35cc6435c2c0d2b4f3b3e7a6b3f4c6d8e9f0', // Example address
        value: '0x1c6bf52634000', // 0.0005 ETH in wei
        from: account,
      };
      
      const hash = await sendTransaction(txParams);
      setTxHash(hash);
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToMainnet = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await switchNetwork('0x1'); // Ethereum Mainnet
    } catch (error) {
      console.error('Network switch failed:', error);
      alert(`Failed to switch to Ethereum Mainnet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToPolygon = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await switchNetwork('0x89'); // Polygon Mainnet
    } catch (error) {
      console.error('Network switch failed:', error);
      alert(`Failed to switch to Polygon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToArbitrum = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await switchNetwork('0xa4b1'); // Arbitrum One
    } catch (error) {
      console.error('Network switch failed:', error);
      alert(`Failed to switch to Arbitrum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToSepolia = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await switchNetwork('0xaa36a7'); // Sepolia Testnet
    } catch (error) {
      console.error('Network switch failed:', error);
      alert(`Failed to switch to Sepolia: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string | null): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: string | null): string => {
    if (!chainId) return 'Unknown';
    
    const networks: Record<string, string> = {
      '0x1': 'Ethereum Mainnet',
      '0x89': 'Polygon Mainnet',
      '0xa': 'Optimism',
      '0xa4b1': 'Arbitrum One',
      '0x38': 'BSC Mainnet',
      '0xaa36a7': 'Sepolia Testnet',
    };
    return networks[chainId] || `Chain ID: ${chainId}`;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">MetaMask Wallet</h2>
      
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Connected Account:</p>
            <p className="font-mono text-lg font-semibold">{formatAddress(account)}</p>
            {chainId && (
              <p className="text-sm text-gray-600 mt-2">
                Network: {getNetworkName(chainId)}
              </p>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Network Switching</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSwitchToMainnet}
                disabled={isLoading}
                className="bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '...' : 'Ethereum'}
              </button>
              <button
                onClick={handleSwitchToPolygon}
                disabled={isLoading}
                className="bg-purple-500 text-white py-2 px-3 rounded text-sm hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '...' : 'Polygon'}
              </button>
              <button
                onClick={handleSwitchToArbitrum}
                disabled={isLoading}
                className="bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '...' : 'Arbitrum'}
              </button>
              <button
                onClick={handleSwitchToSepolia}
                disabled={isLoading}
                className="bg-orange-500 text-white py-2 px-3 rounded text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {isLoading ? '...' : 'Sepolia'}
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Sign Message</h3>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter message to sign"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSignMessage}
              disabled={!message.trim() || isLoading}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing...' : 'Sign Message'}
            </button>
            {signature && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs break-all">
                <strong>Signature:</strong> {signature}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Send Transaction</h3>
            <button
              onClick={handleSendTransaction}
              disabled={isLoading}
              className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send 0.0005 ETH (Test)'}
            </button>
            {txHash && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs break-all">
                <strong>Transaction Hash:</strong> 
                <a 
                  href={`https://etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline ml-1"
                >
                  {txHash}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;