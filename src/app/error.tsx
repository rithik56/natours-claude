'use client';
// client: Next.js requires error boundaries to be Client Components
import { Button } from '@/components/ui/button';
import styles from './error.module.css';

type ErrorPageProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// The visitor sees the fixed INTERNAL copy and the digest, and nothing else. The error's own text is
// never rendered: Next.js redacts it for server errors in production, and this page must not undo that (S19).
export default function ErrorPage({ error, retry }: ErrorPageProps) {
  return (
    <div className={styles.page}>
      <h1>Something went wrong on our side. Try again in a moment.</h1>
      {error.digest ? (
        <p className={styles.reference}>Reference: {error.digest}</p>
      ) : null}
      <Button variant="secondary" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
