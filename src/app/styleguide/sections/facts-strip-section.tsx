import { FactsStrip } from '@/components/ui/facts-strip';
import styles from '../styleguide.module.css';

// Real seed tours from seed/data/tours.json (plan.md §9.1).
export function FactsStripSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-facts-strip"
    >
      <h2 id="styleguide-facts-strip">Facts strip</h2>
      <p className={styles.note}>
        The facts above a tour page&apos;s description. One row at 64em and up,
        wrapping below it.
      </p>
      <h3>Medium, with a 4.5 rating</h3>
      <FactsStrip
        difficulty="medium"
        lengthDays={6}
        groupSize={14}
        location="Rishikesh, Uttarakhand"
        rating={4.5}
      />
      <h3>Difficult, with a 4.5 rating</h3>
      <FactsStrip
        difficulty="difficult"
        lengthDays={8}
        groupSize={12}
        location="Leh, Ladakh"
        rating={4.5}
      />
    </section>
  );
}
