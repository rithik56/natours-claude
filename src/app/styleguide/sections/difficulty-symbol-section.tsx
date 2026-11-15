import { DifficultySymbol } from '@/components/ui/difficulty-symbol';
import styles from '../styleguide.module.css';

// The rating always shows its word, so the peaks never carry the meaning alone (U22).
export function DifficultySymbolSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-difficulty">
      <h2 id="styleguide-difficulty">Difficulty</h2>
      <p className={styles.note}>
        One, two or three peaks, always with the word. Each level is shown on a
        real seed tour.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Kerala Backwaters and Hills</span>
          <DifficultySymbol level="easy" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Valley of Flowers Trek</span>
          <DifficultySymbol level="medium" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Ladakh High Passes</span>
          <DifficultySymbol level="difficult" />
        </li>
      </ul>
    </section>
  );
}
