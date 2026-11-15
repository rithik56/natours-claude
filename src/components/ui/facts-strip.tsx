import { DifficultySymbol } from './difficulty-symbol';
import { StarRating } from './star-rating';
import styles from './facts-strip.module.css';

type FactsStripProps = {
  difficulty: 'easy' | 'medium' | 'difficult';
  lengthDays: number;
  groupSize: number;
  location: string;
  rating: number;
};

// The tour page's facts: two aligned columns below 64em, with the rating on its own row, and one row from 64em. Each fact is its own list item.
export function FactsStrip({
  difficulty,
  lengthDays,
  groupSize,
  location,
  rating,
}: FactsStripProps) {
  const days = lengthDays === 1 ? '1 day' : `${lengthDays} days`;

  return (
    <ul className={styles.strip}>
      <li className={styles.fact}>
        <DifficultySymbol level={difficulty} />
      </li>
      <li className={styles.fact}>{days}</li>
      <li className={styles.fact}>Up to {groupSize} people</li>
      <li className={styles.fact}>{location}</li>
      <li className={`${styles.fact} ${styles.rating}`}>
        <StarRating value={rating} />
      </li>
    </ul>
  );
}
