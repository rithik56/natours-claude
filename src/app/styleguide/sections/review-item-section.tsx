'use client';
// client: the editable review passes an onDelete callback, which a Server Component cannot send to a Client Component

import { useState } from 'react';
import { ReviewItem } from '@/components/ui/review-item';
import styles from '../styleguide.module.css';

const DONE = 'Review deleted.';

// Two of the four Ladakh High Passes reviews from seed/data/reviews.json, word for word.
const farhan = {
  authorName: 'Farhan Siddiqui',
  rating: 5,
  comment:
    "Two full days in Leh before going higher made all the difference, and nobody in our group got sick. Crossing Khardung La, the double-humped camels at Hunder and the colours of Pangong at sunset were the highlights. Tsering's stories about growing up in Leh made the long drives fly by.",
  createdAt: '2026-07-28T20:15:00+05:30',
};

const nandini = {
  authorName: 'Nandini Reddy',
  rating: 4,
  comment:
    'Spectacular landscapes and a careful, safety-first team. Expect long days in the vehicle and a cold night at Pangong, where the camp had electricity for only a few hours. Worth every rupee.',
  createdAt: '2026-07-30T20:15:00+05:30',
};

export function ReviewItemSection() {
  const [deleted, setDeleted] = useState(false);

  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-review-item"
    >
      <h2 id="styleguide-review-item">Review item</h2>
      <p className={styles.note}>
        The stars, the author, the date and the comment. Only the reviewer sees
        Edit review and Delete review, and deleting asks first.
      </p>
      <h3>Another traveller’s reviews</h3>
      <ul className={styles.states} aria-label="Reviews by other travellers">
        <ReviewItem {...farhan} />
        <ReviewItem {...nandini} />
      </ul>
      <h3>Your own review</h3>
      <ul className={styles.states} aria-label="Your review">
        <ReviewItem
          {...nandini}
          canEdit
          editHref="/tour/ladakh-high-passes"
          onDelete={() => setDeleted(true)}
        />
      </ul>
      <p role="status" className={styles.note}>
        {deleted ? DONE : null}
      </p>
    </section>
  );
}
