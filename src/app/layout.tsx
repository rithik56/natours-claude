import type { Metadata } from 'next';
import { connection } from 'next/server';
import '../styles/reset.css';
import '../styles/tokens.css';
import '../styles/base.css';
import { anekLatin } from '../styles/fonts';
import { Footer } from '@/components/ui/footer';
import { Header } from '@/components/ui/header';
import { SkipLink } from '@/components/ui/skip-link';
import { getConfig } from '@/server/config';

// ARC-07: built inside generateMetadata, never at module scope, so the root metadata
// needs APP_URL only when a page is rendered. Pages set their own title and social tags.
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getConfig().appOrigin),
    title: { default: 'Natours', template: '%s | Natours' },
    openGraph: { siteName: 'Natours', locale: 'en_IN', type: 'website' },
  };
}

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
