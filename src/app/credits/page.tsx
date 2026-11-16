import type { Metadata } from 'next';
import { CreditsGroup } from '@/components/features/credits-group';
import { getConfig } from '@/server/config';
import { listCredits } from '@/server/modules/tours/service';
import styles from './page.module.css';

/**
 * Title, description and canonical URL for `/credits` (R10, SEC-12). The origin comes from
 * APP_URL, read inside the function, never at module scope (ARC-07).
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Photo credits',
    description: 'Author, licence and source for every photo on Natours.',
    alternates: { canonical: `${getConfig().appOrigin}/credits` },
  };
}

// D-10, U27: every catalogue photo's credit, grouped by tour in seed order. A Server Component
// with no client JavaScript and no preloaded image. There is no loading.tsx: its Suspense
// boundary would stream the list into hidden HTML that only script reveals, so with JavaScript
// off the page would show its heading and nothing else (ADR 0040, as ADR 0039 for the tour page).
export default async function CreditsPage() {
  const groups = await listCredits();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Photo credits</h1>
        {/* The only change made to the photos, as their licences ask (DES-06). */}
        <p className={styles.intro}>
          Every photo on Natours is from Wikimedia Commons, used under the
          licence shown. Photos were resized and saved as JPEG; nothing else was
          changed.
        </p>
      </header>
      {groups.map((group) => (
        <CreditsGroup key={group.slug} group={group} />
      ))}
    </div>
  );
}
