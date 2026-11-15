import styles from './star-rating.module.css';

type StarRatingProps = { value: number; max?: number };

type Fill = 'full' | 'half' | 'empty';

// Each peak is full, half or empty. The number is printed beside the glyphs, so colour is never the only cue.
function peakFill(value: number, index: number): Fill {
  if (value >= index + 1) return 'full';
  if (value >= index + 0.5) return 'half';
  return 'empty';
}

// A static, non-operable display. It is a role="img" graphic, never a radiogroup or radio.
export function StarRating({ value, max = 5 }: StarRatingProps) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new RangeError(`A rating is a number from 0 to ${max}`);
  }
  const indexes = Array.from({ length: max }, (_, index) => index);

  return (
    <span className={styles.rating}>
      <span
        role="img"
        aria-label={`Rated ${value} out of ${max}`}
        className={styles.peaks}
      >
        {indexes.map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className={styles.peak}
            data-fill={peakFill(value, index)}
          >
            ★
          </span>
        ))}
      </span>
      <span aria-hidden="true" className={styles.value}>
        {value.toFixed(1)}
      </span>
    </span>
  );
}
