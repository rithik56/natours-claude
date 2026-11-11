import type { Metadata } from 'next';
import { connection } from 'next/server';
import '../styles/reset.css';
import '../styles/tokens.css';
import '../styles/base.css';
import { anekLatin } from '../styles/fonts';

export const metadata: Metadata = {
  title: 'Natours',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render every page per request so the CSP nonce can reach its scripts.
  await connection();
  return (
    <html lang="en-IN" className={anekLatin.variable}>
      <body>{children}</body>
    </html>
  );
}
