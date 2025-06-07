import type { Metadata } from 'next'
import './globals.css'
import { MetaMaskProvider } from '../providers/MetaMaskProvider';

export const metadata: Metadata = {
  title: 'next js app',
  description: '',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body><MetaMaskProvider>{children}</MetaMaskProvider></body>
    </html>
  )
}
