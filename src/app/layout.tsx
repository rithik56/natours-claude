import type { Metadata } from 'next';
import { connection } from 'next/server';
import '../styles/reset.css';
import '../styles/tokens.css';
import '../styles/base.css';
import { anekLatin } from '../styles/fonts';
import { Footer } from '@/components/ui/footer';
import { Header } from '@/components/ui/header';
import { SkipLink } from '@/components/ui/skip-link';

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
  // Every page gets the same shell: skip link first, then header, the one main landmark and footer.
  const currentYear = new Date().getFullYear();
  return (
    <html lang="en-IN" className={anekLatin.variable}>
      <body>
        <SkipLink />
        <Header isLoggedIn={false} />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer isLoggedIn={false} currentYear={currentYear} />
      </body>
    </html>
  );
}
