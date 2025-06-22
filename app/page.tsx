// app/page.tsx
import { MetaMaskProvider } from '@/providers/MetaMaskProvider';
import HyperLiquidDashboard from '@/components/HyperLiquidDashboard';
// import WalletConnection from '@/components/WalletConnection';

export default function Home() {
  return (
    <MetaMaskProvider>
      <main className="bg-gray-100 min-h-screen py-8">
        
        <HyperLiquidDashboard />
      </main>
    </MetaMaskProvider>
  );
}