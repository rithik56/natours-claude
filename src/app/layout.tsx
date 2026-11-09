import type { Metadata } from 'next';
import { connection } from 'next/server';

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
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
