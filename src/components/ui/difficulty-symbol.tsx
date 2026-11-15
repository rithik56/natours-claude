import styles from './difficulty-symbol.module.css';

type DifficultyLevel = 'easy' | 'medium' | 'difficult';

const levels: Record<DifficultyLevel, { peaks: number; label: string }> = {
  easy: { peaks: 1, label: 'Easy' },
  medium: { peaks: 2, label: 'Medium' },
  difficult: { peaks: 3, label: 'Difficult' },
};

// The peaks repeat the rating visually, and the word beside them carries it in text (U22), so screen readers hear only the word.
export function DifficultySymbol({ level }: { level: DifficultyLevel }) {
  const { peaks, label } = levels[level];
  return (
    <span className={styles.difficulty}>
      <span className={styles.peaks} aria-hidden="true">
        {'▲'.repeat(peaks)}
      </span>
      <span className={styles.label}>{label}</span>
    </span>
  );
}
