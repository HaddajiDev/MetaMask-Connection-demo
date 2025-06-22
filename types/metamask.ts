// // Types and interfaces for MetaMask integration
// // This file contains only type definitions - no SDK imports

// export interface NetworkConfig {
//   chainId: string;
//   chainName: string;
//   nativeCurrency: {
//     name: string;
//     symbol: string;
//     decimals: number;
//   };
//   rpcUrls: string[];
//   blockExplorerUrls?: string[];
// }

// export interface MetaMaskError {
//   code: number;
//   message: string;
// }

// export interface TransactionParameters {
//   to: string;
//   from?: string;
//   value?: string;
//   gas?: string;
//   gasPrice?: string;
//   data?: string;
// }

// export interface EthereumProvider {
//   isMetaMask?: boolean;
//   request: (args: { method: string; params?: any[] }) => Promise<any>;
//   on: (event: string, handler: (...args: any[]) => void) => void;
//   removeListener: (event: string, handler: (...args: any[]) => void) => void;
//   removeAllListeners: (event: string) => void;
// }

// declare global {
//   interface Window {
//     ethereum?: EthereumProvider;
//   }
// }

// // Common network configurations
// export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
//   ethereum: {
//     chainId: '0x1',
//     chainName: 'Ethereum Mainnet',
//     nativeCurrency: {
//       name: 'Ether',
//       symbol: 'ETH',
//       decimals: 18,
//     },
//     rpcUrls: ['https://mainnet.infura.io/v3/'],
//     blockExplorerUrls: ['https://etherscan.io'],
//   },
//   arbitrum: {
//     chainId: '0xa4b1',
//     chainName: 'Arbitrum One',
//     nativeCurrency: {
//       name: 'Ether',
//       symbol: 'ETH',
//       decimals: 18,
//     },
//     rpcUrls: ['https://arb1.arbitrum.io/rpc'],
//     blockExplorerUrls: ['https://arbiscan.io'],
//   },
//   polygon: {
//     chainId: '0x89',
//     chainName: 'Polygon Mainnet',
//     nativeCurrency: {
//       name: 'MATIC',
//       symbol: 'MATIC',
//       decimals: 18,
//     },
//     rpcUrls: ['https://polygon-rpc.com/'],
//     blockExplorerUrls: ['https://polygonscan.com'],
//   },
// };

// // Utility functions
// export const formatChainId = (chainId: string): number => {
//   return parseInt(chainId, 16);
// };

// export const hexToDecimal = (hex: string): number => {
//   return parseInt(hex, 16);
// };

// export const decimalToHex = (decimal: number): string => {
//   return '0x' + decimal.toString(16);
// };

// export const isMetaMaskInstalled = (): boolean => {
//   return typeof window !== 'undefined' && 
//          typeof window.ethereum !== 'undefined' && 
//          window.ethereum.isMetaMask === true;
// };