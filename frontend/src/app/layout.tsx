import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MariTycoon',
  description: 'Monopoli Indonesia multiplayer web'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
