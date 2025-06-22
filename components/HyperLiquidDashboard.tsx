'use client';

import { useState, useEffect } from 'react';
import { useMetaMask, getNetworkName, formatChainId, NETWORKS } from '../providers/MetaMaskProvider';
import * as hl from '@nktkas/hyperliquid';

const MY_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MY_VAULT_ADDRESS;

const HYPERLIQUID_CHAIN_ID = '0xa4b1';
const ARBITRUM_CHAIN_ID_DECIMAL = 42161;

export default function HyperLiquidDashboard() {
  const { account, isConnected, connect, chainId, switchChain, addChain } = useMetaMask();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('');
  const [vaultDetails, setVaultDetails] = useState<any>(null);
  const [userVaultDetails, setUserVaultDetails] = useState<any>(null);
  const [vaultSummaries, setVaultSummaries] = useState<any[]>([]);
  
  const [isTestnet] = useState(false);

  const isCorrectNetwork = chainId === HYPERLIQUID_CHAIN_ID;
  const currentNetworkName = chainId ? getNetworkName(chainId) : 'Unknown';

  const transport = new hl.HttpTransport();
  const publicClient = new hl.InfoClient({ transport });
  
  // Create wallet client with proper chain ID configuration
  const walletClient = isConnected && window.ethereum && isCorrectNetwork
    ? new hl.ExchangeClient({ 
        wallet: {
          ...window.ethereum,
          // Override the chain ID methods to ensure consistency
          request: async (args: any) => {
            // Intercept eth_chainId requests to ensure consistent chain ID
            if (args.method === 'eth_chainId') {
              return HYPERLIQUID_CHAIN_ID;
            }
            return window.ethereum.request(args);
          }
        },
        transport,
        isTestnet: isTestnet,
        signatureChainId: HYPERLIQUID_CHAIN_ID, // Use hex format consistently
      })
    : null;

  // Alternative wallet client configuration that might work better
  const createWalletClient = () => {
    if (!isConnected || !window.ethereum || !isCorrectNetwork) {
      return null;
    }

    try {
      // Create a custom wallet object that ensures proper chain ID handling
      const customWallet = {
        ...window.ethereum,
        request: async (args: any) => {
          const result = await window.ethereum.request(args);
          
          // Ensure chain ID is always returned in the expected format
          if (args.method === 'eth_chainId') {
            // Convert to hex if it's decimal
            if (typeof result === 'number') {
              return `0x${result.toString(16)}`;
            }
            // Ensure it's the correct Arbitrum chain ID
            if (result === '0xa4b1' || result === ARBITRUM_CHAIN_ID_DECIMAL || result === '42161') {
              return HYPERLIQUID_CHAIN_ID;
            }
          }
          
          return result;
        }
      };

      return new hl.ExchangeClient({ 
        wallet: customWallet,
        transport,
        isTestnet: isTestnet,
        signatureChainId: HYPERLIQUID_CHAIN_ID,
      });
    } catch (error) {
      console.error('Error creating wallet client:', error);
      return null;
    }
  };

  // Use the alternative wallet client
  const alternativeWalletClient = createWalletClient();

  const handleNetworkSwitch = async () => {
    try {
      setError(null);
      await switchChain(HYPERLIQUID_CHAIN_ID);
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      if (error.code === 4902) {
        try {
          await addChain(NETWORKS.ARBITRUM);
          await switchChain(HYPERLIQUID_CHAIN_ID);
        } catch (addError) {
          setError('Failed to add Arbitrum network to MetaMask');
        }
      } else {
        setError('Failed to switch to Arbitrum network');
      }
    }
  };

  const fetchVaultDetails = async () => {
    if (!MY_VAULT_ADDRESS || MY_VAULT_ADDRESS === "0x...") {
      setError('Vault address not configured');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      
      console.log('Fetching vault details for:', MY_VAULT_ADDRESS);
      
      const details = await publicClient.vaultDetails({ vaultAddress: MY_VAULT_ADDRESS });
      console.log('Vault details:', details);
      setVaultDetails(details);
      
      if (account) {
        console.log('Fetching user-specific vault details for:', account);
        const userDetails = await publicClient.vaultDetails({ 
          vaultAddress: MY_VAULT_ADDRESS, 
          user: account 
        });
        console.log('User vault details:', userDetails);
        setUserVaultDetails(userDetails);
      }
      
      const summaries = await publicClient.vaultSummaries();
      console.log('Vault summaries:', summaries);
      setVaultSummaries(summaries);
      
    } catch (err) {
      console.error('Error fetching vault details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vault details');
    } finally {
      setIsLoading(false);
    }
  };

  const ensureCorrectNetwork = async () => {
    if (!isCorrectNetwork) {
      throw new Error('Please switch to Arbitrum One network first');
    }
    
    // Double-check the network is correct before proceeding
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    console.log('Current chain ID from MetaMask:', currentChainId);
    console.log('Expected chain ID:', HYPERLIQUID_CHAIN_ID);
    
    if (currentChainId !== HYPERLIQUID_CHAIN_ID) {
      throw new Error(`Network mismatch. Expected ${HYPERLIQUID_CHAIN_ID}, got ${currentChainId}`);
    }
  };

  const handleVaultDeposit = async () => {
    const clientToUse = alternativeWalletClient || walletClient;
    
    if (!clientToUse) {
      if (!isConnected) {
        setError('Please connect your wallet first');
      } else if (!isCorrectNetwork) {
        setError('Please switch to Arbitrum One network');
      }
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Ensure we're on the correct network
      await ensureCorrectNetwork();

      console.log('Depositing to vault:', MY_VAULT_ADDRESS, 'Amount:', actionAmount);
      console.log('Using wallet client with chain ID:', HYPERLIQUID_CHAIN_ID);

      const result = await clientToUse.vaultTransfer({
        vaultAddress: MY_VAULT_ADDRESS,
        isDeposit: true,
        usd: parseFloat(actionAmount)
      });

      console.log('Deposit result:', result);
      
      if (result && (result as any).status === 'ok') {
        alert('Vault deposit successful!');
        setActionAmount('');
        await fetchVaultDetails();
      } else {
        throw new Error((result as any)?.response?.data || 'Deposit failed');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      
      // Provide more specific error messages for chain ID issues
      if (err instanceof Error && err.message.includes('chainId')) {
        setError(`Chain ID mismatch error. Please ensure MetaMask is on Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID_DECIMAL}). Current error: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'Deposit failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultWithdraw = async () => {
    const clientToUse = alternativeWalletClient || walletClient;
    
    if (!clientToUse) {
      if (!isConnected) {
        setError('Please connect your wallet first');
      } else if (!isCorrectNetwork) {
        setError('Please switch to Arbitrum One network');
      }
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Ensure we're on the correct network
      await ensureCorrectNetwork();

      console.log('Withdrawing from vault:', MY_VAULT_ADDRESS, 'Amount:', actionAmount);

      const result = await clientToUse.vaultTransfer({
        vaultAddress: MY_VAULT_ADDRESS,
        isDeposit: false,
        usd: parseFloat(actionAmount)
      });

      console.log('Withdrawal result:', result);
      
      if (result && (result as any).status === 'ok') {
        alert('Vault withdrawal successful!');
        setActionAmount('');
        await fetchVaultDetails();
      } else {
        throw new Error((result as any)?.response?.data || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      
      // Provide more specific error messages for chain ID issues
      if (err instanceof Error && err.message.includes('chainId')) {
        setError(`Chain ID mismatch error. Please ensure MetaMask is on Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID_DECIMAL}). Current error: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'Withdrawal failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBridgeWithdraw = async () => {
    const clientToUse = alternativeWalletClient || walletClient;
    
    if (!clientToUse || !account) {
      if (!isConnected) {
        setError('Please connect your wallet first');
      } else if (!isCorrectNetwork) {
        setError('Please switch to Arbitrum One network');
      }
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Ensure we're on the correct network
      await ensureCorrectNetwork();

      console.log('Bridge withdrawal to:', account, 'Amount:', actionAmount);

      const result = await clientToUse.withdraw3({
        destination: account,
        amount: actionAmount
      });

      console.log('Bridge withdrawal result:', result);
      
      if (result && (result as any).status === 'ok') {
        alert('Bridge withdrawal successful!');
        setActionAmount('');
        await fetchVaultDetails();
      } else {
        throw new Error((result as any)?.response?.data || 'Bridge withdrawal failed');
      }
    } catch (err) {
      console.error('Bridge withdrawal error:', err);
      
      // Provide more specific error messages for chain ID issues
      if (err instanceof Error && err.message.includes('chainId')) {
        setError(`Chain ID mismatch error. Please ensure MetaMask is on Arbitrum One (Chain ID: ${ARBITRUM_CHAIN_ID_DECIMAL}). Current error: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : 'Bridge withdrawal failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultDetails();
  }, [account, isConnected, isCorrectNetwork]);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          HyperLiquid Vault Manager
        </h2>
        <div className="text-center space-y-2">
          {isConnected ? (
            <div>
              <p className="text-green-600 font-semibold">✅ Connected: {formatAddress(account!)}</p>
              <p className="text-gray-600">Network: {currentNetworkName}</p>
              {!isCorrectNetwork && (
                <div className="mt-3">
                  <p className="text-orange-600 font-semibold mb-2">
                    ⚠️ Wrong Network - HyperLiquid requires Arbitrum One (Chain ID: {ARBITRUM_CHAIN_ID_DECIMAL})
                  </p>
                  <button 
                    onClick={handleNetworkSwitch}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Switch to Arbitrum One
                  </button>
                </div>
              )}
              {vaultDetails?.leader && (
                <p className="text-gray-600">
                  Vault Leader: {formatAddress(vaultDetails.leader)}
                  {account?.toLowerCase() === vaultDetails.leader.toLowerCase() && (
                    <span className="text-blue-600 ml-2">(You)</span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">Please connect your wallet to access vault functions</p>
              <button 
                onClick={connect}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-600 bg-red-100 p-4 rounded-lg text-center">
          <strong>Error:</strong> {error}
          <br />
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-4 text-sm">
          <strong>Debug Info:</strong>
          <br />Vault Address: {MY_VAULT_ADDRESS}
          <br />Connected Account: {account || 'None'}
          <br />Chain ID: {chainId || 'None'} ({chainId ? formatChainId(chainId) : 'N/A'})
          <br />Network: {currentNetworkName}
          <br />Correct Network: {isCorrectNetwork ? 'Yes' : 'No'}
          <br />Expected Chain ID: {HYPERLIQUID_CHAIN_ID} ({ARBITRUM_CHAIN_ID_DECIMAL})
          <br />Testnet: {isTestnet ? 'Yes' : 'No'}
          <br />Vault Details: {vaultDetails ? 'Loaded' : 'Not loaded'}
          <br />Original Wallet Client: {walletClient ? 'Ready' : 'Not ready'}
          <br />Alternative Wallet Client: {alternativeWalletClient ? 'Ready' : 'Not ready'}
        </div>
      )}

      {vaultDetails?.followers && vaultDetails.followers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            Vault Followers ({vaultDetails.followers.length})
          </h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {vaultDetails.followers.map((follower: any, index: number) => (
              <div key={follower.user} className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
                <p>
                  <strong>User:</strong> {formatAddress(follower.user)}
                  {follower.user.toLowerCase() === vaultDetails.leader?.toLowerCase() && (
                    <span className="text-blue-600 ml-2">(Leader)</span>
                  )}
                  {follower.user.toLowerCase() === account?.toLowerCase() && (
                    <span className="text-green-600 ml-2">(You)</span>
                  )}
                </p>
                <p><strong>Vault Equity:</strong> ${parseFloat(follower.vaultEquity).toFixed(2)}</p>
                <p><strong>PNL:</strong> ${parseFloat(follower.pnl).toFixed(2)}</p>
                <p><strong>All Time PNL:</strong> ${parseFloat(follower.allTimePnl).toFixed(2)}</p>
                <p><strong>Days Following:</strong> {follower.daysFollowing}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isConnected && userVaultDetails?.followers && userVaultDetails.followers.length > 0 && (
        <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
          <h3 className="text-xl font-bold mb-4 text-blue-800">
            Your Vault Details ({formatAddress(account!)})
          </h3>
          {userVaultDetails.followers.map((follower: any) => (
            <div key={follower.user} className="space-y-2">
              <p><strong>Vault Equity:</strong> ${parseFloat(follower.vaultEquity).toFixed(2)}</p>
              <p><strong>PNL:</strong> ${parseFloat(follower.pnl).toFixed(2)}</p>
              <p><strong>All Time PNL:</strong> ${parseFloat(follower.allTimePnl).toFixed(2)}</p>
              <p><strong>Days Following:</strong> {follower.daysFollowing}</p>
            </div>
          ))}
        </div>
      )}

      {isConnected && isCorrectNetwork && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-indigo-500">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Vault Operations</h3>
          <div className="space-y-4">
            <input 
              type="number" 
              value={actionAmount} 
              onChange={(e) => setActionAmount(e.target.value)} 
              placeholder="Amount (USD)" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={handleVaultDeposit} 
                disabled={isLoading}
                className="bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Vault Deposit'}
              </button>
              <button 
                onClick={handleVaultWithdraw} 
                disabled={isLoading}
                className="bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Vault Withdraw'}
              </button>
              <button 
                onClick={handleBridgeWithdraw} 
                disabled={isLoading}
                className="bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Bridge Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="bg-yellow-50 rounded-lg border-2 border-yellow-200 p-6 text-center">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">Network Switch Required</h3>
          <p className="text-yellow-700 mb-4">
            HyperLiquid operations require the Arbitrum One network (Chain ID: {ARBITRUM_CHAIN_ID_DECIMAL}). Please switch networks to continue.
          </p>
          <button 
            onClick={handleNetworkSwitch}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-yellow-600"
          >
            Switch to Arbitrum One
          </button>
        </div>
      )}

      {vaultSummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">All Vault Summaries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaultSummaries.slice(0, 6).map((vault: any) => (
              <div key={vault.vaultAddress} className="border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Vault:</strong> {formatAddress(vault.vaultAddress)}
                </p>
                <p className="text-sm">
                  <strong>Leader:</strong> {formatAddress(vault.leader)}
                </p>
                <p className="text-sm">
                  <strong>Total Equity:</strong> ${parseFloat(vault.totalVaultEquity || '0').toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-gray-600">
            Connect your wallet to access vault operations and view your specific vault details.
          </p>
        </div>
      )}

      <div className="text-center">
        <button 
          onClick={fetchVaultDetails}
          disabled={isLoading}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
}