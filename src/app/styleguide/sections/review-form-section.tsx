'use client';
// client: the section stops the demonstration forms from posting, which needs a submit handler a Server Component cannot hold

import { useState, type FormEvent } from 'react';
import { ReviewForm } from '@/components/ui/review-form';
import styles from '../styleguide.module.css';

// Nothing is saved on the styleguide. The status line only shows what the browser would have sent.
export function ReviewFormSection() {
  const [sent, setSent] = useState('');

  function handleSubmit(event: FormEvent<HTMLDivElement>) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    const rating = data.get('rating');
    const comment = String(data.get('comment') ?? '');
    setSent(
      `Would send: ${rating ? `${rating} out of 5` : 'no rating'}, ${comment.length} characters.`,
    );
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-review-form"
    >
      <h2 id="styleguide-review-form">Review form</h2>
      <p className={styles.note}>
        The star input and a comment of 1 to 1,000 characters. The form shows
        only when the caller says the traveller can review, and the server
        checks that again when a review is posted.
      </p>
      <h3>Can review</h3>
      <div onSubmit={handleSubmit}>
        <ReviewForm canReview />
      </div>
      <p role="status" className={styles.note}>
        {sent}
      </p>
      <h3>With a field error</h3>
      <div onSubmit={handleSubmit}>
        <ReviewForm canReview commentError="Review is required." />
      </div>
      <h3>Cannot review</h3>
      <ReviewForm canReview={false} />
      <p className={styles.note}>
        Nothing is shown above, because this traveller has no completed booking
        on the tour.
      </p>
    </section>
  );
}
