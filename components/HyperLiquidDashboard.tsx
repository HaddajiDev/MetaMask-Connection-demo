'use client';

import { useState, useEffect } from 'react';
import { useMetaMask } from '../providers/MetaMaskProvider';
import axios from 'axios';

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz';
const MY_VAULT_ADDRESS = process.env.NEXT_PUBLIC_MY_VAULT_ADDRESS;
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;

interface ConfigInfo {
  network: string;
  base_url: string;
  wallet_address: string;
}

interface Follower {
  user: string;
  vaultEquity: string;
  pnl: string;
  allTimePnl: string;
  daysFollowing: number;
  vaultEntryTime: number;
  lockupUntil: number;
}

interface VaultDetails {
  followers: Follower[];
}

export default function HyperLiquidDashboard() {
  const { account, isConnected, connect, disconnect } = useMetaMask();

  const [configInfo, setConfigInfo] = useState<ConfigInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOwnerConnected, setIsOwnerConnected] = useState<boolean>(false);
  const [actionAmount, setActionAmount] = useState<string>('');
  const [leaderVaultDetails, setLeaderVaultDetails] = useState<VaultDetails | null>(null);
  const [connectedUserSpecificVaultDetails, setConnectedUserSpecificVaultDetails] = useState<Follower | null>(null);

  // Initialize config info
  useEffect(() => {
    setConfigInfo({
      network: 'mainnet',
      base_url: HYPERLIQUID_API_URL,
      wallet_address: ADMIN_WALLET_ADDRESS || "0x..."
    });
  }, []);

  const fetchSpecificVaultDetails = async (vaultAddress: string, userAddress: string) => {
    if (!vaultAddress || !userAddress) {
      return null;
    }
    try {
      const res = await axios.post(`${HYPERLIQUID_API_URL}/info`, {
        type: 'vaultDetails',
        vaultAddress: vaultAddress,
        user: userAddress,
      });
      return res.data;
    } catch (err) {
      console.error(`Failed to fetch vault details for user ${userAddress}:`, err);
      return null;
    }
  };

  const getUserNonce = async (userAddress: string) => {
    try {
      const res = await axios.post(`${HYPERLIQUID_API_URL}/info`, {
        type: 'clearinghouseState',
        user: userAddress,
      });
      return res.data.nonce || 0;
    } catch (err) {
      console.error('Failed to fetch user nonce:', err);
      return 0;
    }
  };

  const signL1Action = async (
    connection: any,
    action: any,
    activePool: number | null = null,
    nonce: number
  ) => {
    const normalizedAction = JSON.parse(JSON.stringify(action));
    if (normalizedAction.vaultAddress) {
      normalizedAction.vaultAddress = normalizedAction.vaultAddress.toLowerCase();
    }
    if (normalizedAction.destination) {
      normalizedAction.destination = normalizedAction.destination.toLowerCase();
    }

    const msgToSign = {
      domain: {
        name: 'HyperLiquid',
        version: '1',
        chainId: 42161, // Arbitrum One
        verifyingContract: '0x0000000000000000000000000000000000000000',
      },
      types: {
        Agent: [
          { name: 'source', type: 'string' },
          { name: 'connectionId', type: 'bytes32' },
        ],
      },
      primaryType: 'Agent',
      message: {
        source: activePool === null ? 'a' : 'b',
        connectionId: connection,
      },
    };

    const types = {
      ...msgToSign.types,
      HyperLiquid: [
        { name: 'hyperliquidChain', type: 'string' },
        { name: 'signatureChainId', type: 'uint256' },
        { name: 'time', type: 'uint64' },
        { name: 'nonce', type: 'uint64' },
        { name: 'action', type: 'string' },
      ],
    };

    const message = {
      hyperliquidChain: 'Mainnet',
      signatureChainId: 421614,
      time: Date.now(),
      nonce,
      action: JSON.stringify(normalizedAction), 
    };

    return {
      domain: msgToSign.domain,
      types,
      primaryType: 'HyperLiquid',
      message,
    };
  };

  const submitSignedTransaction = async (signature: string, action: any, nonce: number, vaultAddress?: string) => {
    try {
      console.log('Submitting transaction to HyperLiquid API...');
      console.log('Action:', action);
      console.log('Signature:', signature);
      console.log('Nonce:', nonce);

      const sig_hex = signature.startsWith('0x') ? signature.slice(2) : signature;
      
      if (sig_hex.length !== 130) {
        throw new Error(`Invalid signature length: ${sig_hex.length}, expected 130`);
      }
      
      const r = "0x" + sig_hex.slice(0, 64);  
      const s = "0x" + sig_hex.slice(64, 128);  
      const v = parseInt(sig_hex.slice(128, 130), 16);  
      
      const payload: any = {
        action: action,
        nonce: nonce,
        signature: {
          r: r,
          s: s, 
          v: v
        }
      };
      
      if (vaultAddress) {
        payload.vaultAddress = vaultAddress.toLowerCase();
      }
      
      console.log('Sending payload to HyperLiquid:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(`${HYPERLIQUID_API_URL}/exchange`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('HyperLiquid API response:', response.data);
      
      if (response.data.status === 'ok') {
        return response.data;
      } else {
        const errorMsg = response.data.response || 'Unknown error';
        console.error('Transaction failed:', errorMsg);
        
        if (errorMsg.toLowerCase().includes('does not exist')) {
          throw new Error();
        }
        
        throw new Error(`Transaction failed: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error submitting transaction:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.response || error.response.statusText;
        if (errorMessage?.toLowerCase().includes('does not exist')) {
          throw new Error();
        }
        throw new Error(`HyperLiquid API error: ${errorMessage}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach HyperLiquid API');
      } else {
        throw new Error(error.message || 'Transaction submission failed');
      }
    }
  };

  const handleVaultAction = async (action: 'deposit' | 'withdraw') => {
    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid, positive amount.');
      return;
    }

    if (!account || !isConnected) {
      setError('Please connect your wallet first.');
      return;
    }

    const normalizedAccount = account.toLowerCase();
    const normalizedVaultAddress = MY_VAULT_ADDRESS?.toLowerCase();

    setIsLoading(true);
    setError(null);

    try {
      try {
        const walletCheckRes = await axios.post(`${HYPERLIQUID_API_URL}/info`, {
          type: 'clearinghouseState',
          user: normalizedAccount,
        });
        
        if (!walletCheckRes.data) {
          throw new Error();
        }
      } catch (walletError) {
        console.log(walletError);
        setError("failed");
        setIsLoading(false);
        return;
      }

      // Get user's nonce
      const nonce = await getUserNonce(normalizedAccount);
      
      const vaultAction = {
        type: 'vaultTransfer',
        vaultAddress: normalizedVaultAddress,
        isDeposit: action === 'deposit',
        usd: parseFloat(actionAmount) * 1000000,
      };

      const signaturePayload = await signL1Action(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        vaultAction,
        null,
        nonce
      );

      const signature = await (window as any).ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [normalizedAccount, JSON.stringify(signaturePayload)],
      });

      const result = await submitSignedTransaction(signature, vaultAction, nonce, normalizedVaultAddress);

      if (result.status === 'ok') {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
        setActionAmount('');
        
        if (configInfo) {
          const leaderDetails = await fetchSpecificVaultDetails(normalizedVaultAddress!, configInfo.wallet_address.toLowerCase());
          setLeaderVaultDetails(leaderDetails);
        }
        if (normalizedAccount) {
          const userDetails = await fetchSpecificVaultDetails(normalizedVaultAddress!, normalizedAccount);
          if (userDetails?.followers && userDetails.followers.length > 0) {
            setConnectedUserSpecificVaultDetails(userDetails.followers[0]);
          } else {
            setConnectedUserSpecificVaultDetails(null);
          }
        }
      }
    } catch (err: any) {
      console.error('Transaction error:', err);
      let errorMessage = 'Transaction failed';
      
      if (err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBridgeWithdraw = async () => {
    if (!actionAmount || parseFloat(actionAmount) <= 0) {
      setError('Please enter a valid, positive amount.');
      return;
    }
    if (!account) {
      setError('Please connect your wallet first.');
      return;
    }
    
    const normalizedAccount = account.toLowerCase();
    
    setIsLoading(true);
    setError(null);

    try {
      try {
        const walletCheckRes = await axios.post(`${HYPERLIQUID_API_URL}/info`, {
          type: 'clearinghouseState',
          user: normalizedAccount,
        });
        
        if (!walletCheckRes.data) {
          throw new Error('Wallet not found on HyperLiquid');
        }
      } catch (walletError) {
        console.log(walletError);
        setError('Your wallet is not registered on HyperLiquid.');
        setIsLoading(false);
        return;
      }

      const nonce = await getUserNonce(normalizedAccount);
      
      const withdrawAction = {
        type: 'withdraw',
        hyperliquidChain: 'Mainnet',
        signatureChainId: 421614,
        amount: (parseFloat(actionAmount) * 1000000).toString(),
        time: Date.now(),
        destination: normalizedAccount,
      };

      const signaturePayload = await signL1Action(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        withdrawAction,
        null,
        nonce
      );

      const signature = await (window as any).ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [normalizedAccount, JSON.stringify(signaturePayload)],
      });

      const result = await submitSignedTransaction(signature, withdrawAction, nonce);

      if (result.status === 'ok') {
        alert('Bridge withdrawal successful!');
        setActionAmount('');
        
        const userDetails = await fetchSpecificVaultDetails(MY_VAULT_ADDRESS?.toLowerCase()!, normalizedAccount);
        if (userDetails?.followers && userDetails.followers.length > 0) {
          setConnectedUserSpecificVaultDetails(userDetails.followers[0]);
        } else {
          setConnectedUserSpecificVaultDetails(null);
        }
      }
    } catch (err: any) {
      console.error('Bridge withdrawal error:', err);
      let errorMessage = 'Bridge withdrawal failed';
      
      if (err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getLeaderDetails = async () => {
      if (configInfo && MY_VAULT_ADDRESS) {
        const details = await fetchSpecificVaultDetails(MY_VAULT_ADDRESS, configInfo.wallet_address);
        setLeaderVaultDetails(details);
      }
    };
    getLeaderDetails();
  }, [configInfo]);

  useEffect(() => {
    const getUserDetailsAndSetOwner = async () => {
      if (isConnected && account && MY_VAULT_ADDRESS) {
        setIsOwnerConnected(account.toLowerCase() === configInfo?.wallet_address.toLowerCase());
        
        const details = await fetchSpecificVaultDetails(MY_VAULT_ADDRESS, account);
        if (details?.followers && details.followers.length > 0 && details.followers[0].user.toLowerCase() === account.toLowerCase()) {
          setConnectedUserSpecificVaultDetails(details.followers[0]);
        } else {
          setConnectedUserSpecificVaultDetails(null);
        }
      } else {
        setIsOwnerConnected(false);
        setConnectedUserSpecificVaultDetails(null);
      }
    };
    getUserDetailsAndSetOwner();
  }, [isConnected, account, configInfo]);

  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  const renderFollowerDetails = (follower: Follower, title: string) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
      <div className="border-b pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
        <p><strong>User:</strong> {formatAddress(follower.user)}</p>
        <p><strong>Vault Equity:</strong> ${parseFloat(follower.vaultEquity).toFixed(2)}</p>
        <p><strong>PNL:</strong> ${parseFloat(follower.pnl).toFixed(2)}</p>
        <p><strong>All Time PNL:</strong> ${parseFloat(follower.allTimePnl).toFixed(2)}</p>
        <p><strong>Days Following:</strong> {follower.daysFollowing}</p>
      </div>
    </div>
  );

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
              {isOwnerConnected && (
                <p className="text-blue-600 font-semibold">Admin Access</p>
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
        <div className="text-red-600 bg-red-100 p-4 rounded-lg text-center break-words">
          {error}
        </div>
      )}

      {leaderVaultDetails?.followers && leaderVaultDetails.followers.length > 0 && configInfo && (
        renderFollowerDetails(leaderVaultDetails.followers[0], `Leader's Vault Details (${formatAddress(configInfo.wallet_address)})`)
      )}

      {isConnected && connectedUserSpecificVaultDetails && (
        renderFollowerDetails(connectedUserSpecificVaultDetails, `Your Vault Details (${formatAddress(account!)})`)
      )}

      {isConnected && (
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
                onClick={() => handleVaultAction('deposit')} 
                disabled={isLoading}
                className="bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Vault Deposit'}
              </button>
              <button 
                onClick={() => handleVaultAction('withdraw')} 
                disabled={isLoading}
                className="bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Vault Withdraw'}
              </button>
              <button 
                onClick={handleBridgeWithdraw} 
                disabled={isLoading}
                className="bg-red-500 text-white py-2 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Bridge Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isConnected && !isOwnerConnected && (
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-gray-600">
            You are connected but don't have admin access to this vault.
          </p>
        </div>
      )}
    </div>
  );
}