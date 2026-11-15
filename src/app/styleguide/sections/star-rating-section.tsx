import { StarRating } from '@/components/ui/star-rating';
import { StarRatingInput } from '@/components/ui/star-rating-input';
import styles from '../styleguide.module.css';

// Ratings drawn from the seed reviews' averages, so the demo uses real content.
const displayValues = [4.5, 3, 5];

export function StarRatingSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-star-rating"
    >
      <h2 id="styleguide-star-rating">Star rating</h2>
      <p className={styles.note}>
        The display is read-only and announces its value. The input is a group
        of five radio buttons: Tab to it, then use the arrow keys or Space.
      </p>
      <div className={styles.states}>
        {displayValues.map((value) => (
          <div key={value}>
            <StarRating value={value} />
          </div>
        ))}
      </div>
      <StarRatingInput name="rating" defaultValue={3} />
    </section>
  );
}
