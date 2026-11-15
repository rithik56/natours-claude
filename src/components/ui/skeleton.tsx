import styles from './skeleton.module.css';

type SkeletonVariant = 'text' | 'review-item' | 'guide-item' | 'booking-panel';

type SkeletonProps = {
  width?: string;
  height?: string;
  variant?: SkeletonVariant;
};

// The comment lines a median-length seed review fills at 375px wide. Wide screens hide the extra ones in CSS.
const REVIEW_COMMENT_LINES = [0, 1, 2, 3, 4];

function Line({ className }: { className?: string }) {
  return <span className={`${styles.line} ${className ?? ''}`} />;
}

// A placeholder for one streamed section (R4). It is a still fill, never an animation: U25 allows
// one self-playing motion on the whole site, and that is the route line. The named variants copy the
// box of the real ReviewItem, GuideItem and BookingPanel, so the real content replaces them with no shift.
// It is hidden from assistive technology: the streamed section's own heading and loading state speak for it.
export function Skeleton({ width, height, variant = 'text' }: SkeletonProps) {
  const style = width || height ? { width, height } : undefined;

  if (variant === 'review-item') {
    return (
      <div aria-hidden="true" className={styles.review} style={style}>
        <div className={styles.author}>
          <span className={`${styles.block} ${styles.small}`} />
          <div className={styles.identity}>
            <Line className={styles.name} />
            <Line className={styles.date} />
          </div>
        </div>
        <Line className={styles.rating} />
        <div className={styles.comment}>
          {REVIEW_COMMENT_LINES.map((index) => (
            <Line key={index} className={styles.words} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'guide-item') {
    return (
      <div aria-hidden="true" className={styles.guide} style={style}>
        <span className={`${styles.block} ${styles.medium}`} />
        <div className={styles.identity}>
          <Line className={styles.name} />
          <Line className={styles.date} />
        </div>
      </div>
    );
  }

  if (variant === 'booking-panel') {
    return (
      <div aria-hidden="true" className={styles.booking} style={style}>
        <div className={styles.field}>
          <Line className={styles.label} />
          <span className={`${styles.block} ${styles.control}`} />
        </div>
        <Line className={styles.price} />
        <span className={`${styles.block} ${styles.control}`} />
      </div>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${styles.line} ${styles.text}`}
      style={style}
    />
  );
}
