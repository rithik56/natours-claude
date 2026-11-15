'use client';
// client: Next.js requires the root error boundary to be a Client Component

type GlobalErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// This page replaces the root layout when it renders, so it imports no layout, no CSS module and no
// shared component: the stylesheets may be the very thing that failed. It shows the same fixed copy
// and the digest only, and never the error's own text (S19, T-03-06).
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en-IN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Natours</title>
      </head>
      <body>
        <h1>Something went wrong on our side. Try again in a moment.</h1>
        {error.digest ? <p>Reference: {error.digest}</p> : null}
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      </body>
    </html>
  );
}
