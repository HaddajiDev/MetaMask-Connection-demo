'use client';

import { useState, useEffect } from 'react';
import { useMetaMask } from '../providers/MetaMaskProvider';
import * as hl from '@nktkas/hyperliquid';

const MY_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MY_VAULT_ADDRESS;
const HYPERLIQUID_MAINNET_CHAIN_ID = 999;
const HYPERLIQUID_TESTNET_CHAIN_ID = 998;

export default function HyperLiquidDashboard() {
  const { account, isConnected, connect } = useMetaMask();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionAmount, setActionAmount] = useState<string>('');
  const [vaultDetails, setVaultDetails] = useState<any>(null);
  const [userVaultDetails, setUserVaultDetails] = useState<any>(null);
  const [vaultSummaries, setVaultSummaries] = useState<any[]>([]);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  
  const [isTestnet, setIsTestnet] = useState(true);

  const transport = new hl.HttpTransport({
    server: {
      mainnet: {
        rpc: 'https://rpc.hyperliquid.xyz/evm',
        api: 'https://api.hyperliquid.xyz/info',
      },
      testnet: {
        rpc: 'https://rpc.hyperliquid-testnet.xyz/evm',
        api: 'https://api.hyperliquid-testnet.xyz/info',
      },
    },
    isTestnet: isTestnet,
  });
  
  const publicClient = new hl.InfoClient({ transport });
  
  const walletClient = isConnected && window.ethereum 
    ? new hl.ExchangeClient({ 
        wallet: window.ethereum,
        transport,
        isTestnet: isTestnet,
      })
    : null;

  const getCurrentChainId = () => isTestnet ? HYPERLIQUID_TESTNET_CHAIN_ID : HYPERLIQUID_MAINNET_CHAIN_ID;
  const getCurrentChainName = () => isTestnet ? 'HyperLiquid Testnet' : 'HyperLiquid L1';
  const getCurrentRpcUrl = () => isTestnet ? 'https://rpc.hyperliquid-testnet.xyz/evm' : 'https://rpc.hyperliquid.xyz/evm';
  const getCurrentExplorerUrl = () => isTestnet ? 'https://explorer.hyperliquid-testnet.xyz/' : 'https://explorer.hyperliquid.xyz/';

  const checkChainId = async () => {
    if (window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentChainId(chainId);
        console.log('Current chain ID:', chainId, 'Expected:', `0x${getCurrentChainId().toString(16)}`);
      } catch (error) {
        console.error('Error getting chain ID:', error);
      }
    }
  };

  const switchToHyperLiquid = async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected');
      return;
    }

    const targetChainId = getCurrentChainId();
    const chainHex = `0x${targetChainId.toString(16)}`;

    try {
      setIsLoading(true);
      setError(null);

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }],
      });
      
      await checkChainId();
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainHex,
              chainName: getCurrentChainName(),
              nativeCurrency: {
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
              },
              rpcUrls: [getCurrentRpcUrl()],
              blockExplorerUrls: [getCurrentExplorerUrl()],
            }],
          });
          
          await checkChainId();
        } catch (addError) {
          console.error('Error adding chain:', addError);
          setError(`Failed to add ${getCurrentChainName()} to MetaMask`);
        }
      } else {
        console.error('Error switching chain:', switchError);
        setError(`Failed to switch to ${getCurrentChainName()}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isOnCorrectChain = () => {
    return currentChainId === `0x${getCurrentChainId().toString(16)}`;
  };

  const fetchVaultDetails = async () => {
    if (!MY_VAULT_ADDRESS || MY_VAULT_ADDRESS === "0x...") {
      setError('Vault address not configured');
      return;
    }

    if (!isOnCorrectChain()) {
      setError(`Please switch to ${getCurrentChainName()} first`);
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

  const handleVaultDeposit = async () => {
    if (!walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isOnCorrectChain()) {
      setError('Please switch to HyperLiquid network first');
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Depositing to vault:', MY_VAULT_ADDRESS, 'Amount:', actionAmount);

      const result = await walletClient.vaultTransfer({
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
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaultWithdraw = async () => {
    if (!walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isOnCorrectChain()) {
      setError('Please switch to HyperLiquid network first');
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Withdrawing from vault:', MY_VAULT_ADDRESS, 'Amount:', actionAmount);

      const result = await walletClient.vaultTransfer({
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
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBridgeWithdraw = async () => {
    if (!walletClient || !account) {
      setError('Please connect your wallet first');
      return;
    }

    if (!isOnCorrectChain()) {
      setError('Please switch to HyperLiquid network first');
      return;
    }

    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Bridge withdrawal to:', account, 'Amount:', actionAmount);

      const result = await walletClient.withdraw3({
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
      setError(err instanceof Error ? err.message : 'Bridge withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      checkChainId();
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && isOnCorrectChain()) {
      fetchVaultDetails();
    }
  }, [account, isConnected, currentChainId]);

  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        console.log('Chain changed to:', chainId);
        setCurrentChainId(chainId);
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
          HyperLiquid Vault Manager {isTestnet ? '(Testnet)' : '(Mainnet)'}
        </h2>
        
        <div className="mb-4 text-center">
          <div className="inline-flex rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setIsTestnet(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isTestnet 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => setIsTestnet(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isTestnet 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Mainnet
            </button>
          </div>
          {isTestnet && (
            <p className="text-sm text-blue-600 mt-2">
              💡 Using testnet for safe testing. Get testnet USDC from faucet.
            </p>
          )}
        </div>
        <div className="text-center space-y-2">
          {isConnected ? (
            <div>
              <p className="text-green-600 font-semibold">✅ Connected: {formatAddress(account!)}</p>
              
              <div className="mt-4 p-3 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-sm text-gray-600 mb-2">
                  Current Chain: {currentChainId || 'Unknown'}
                </p>
                {isOnCorrectChain() ? (
                  <p className="text-green-600 font-semibold">✅ Connected to {getCurrentChainName()}</p>
                ) : (
                  <div>
                    <p className="text-red-600 font-semibold mb-2">❌ Wrong Network</p>
                    <button 
                      onClick={switchToHyperLiquid}
                      disabled={isLoading}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
                    >
                      {isLoading ? 'Switching...' : `Switch to ${getCurrentChainName()}`}
                    </button>
                  </div>
                )}
              </div>

              {vaultDetails?.leader && (
                <p className="text-gray-600 mt-2">
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
          <br />Current Chain ID: {currentChainId}
          <br />Expected Chain ID: 0x{getCurrentChainId().toString(16)} ({getCurrentChainId()})
          <br />On Correct Chain: {isOnCorrectChain() ? 'Yes' : 'No'}
          <br />Network: {getCurrentChainName()}
          <br />Testnet: {isTestnet ? 'Yes' : 'No'}
          <br />Vault Details: {vaultDetails ? 'Loaded' : 'Not loaded'}
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

      {isConnected && isOnCorrectChain() && (
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
          disabled={isLoading || !isOnCorrectChain()}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
}