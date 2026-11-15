import Link from 'next/link';
import buttonStyles from '@/components/ui/button.module.css';
import styles from './not-found.module.css';

// A Server Component (no 'use client'): the framework's default for not-found.tsx.
// The link goes to / because it is the only page that exists; Phase 4 points it at /tours.
export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1>{"We couldn't find that page."}</h1>
      <Link
        href="/"
        className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.action}`}
      >
        Back to the tours
      </Link>
    </div>
  );
}
