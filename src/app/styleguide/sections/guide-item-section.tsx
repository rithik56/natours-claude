import { GuideItem } from '@/components/ui/guide-item';
import styles from '../styleguide.module.css';

// The Ladakh High Passes guides, from seed/data/tours.json and seed/data/users.json.
export function GuideItemSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-guide-item">
      <h2 id="styleguide-guide-item">Guide item</h2>
      <p className={styles.note}>
        A guide’s photo, name and role. Seed people have no photos, so initials
        stand in. Nothing here can be rated or clicked.
      </p>
      <ul className={styles.states} aria-label="Your guides">
        <GuideItem name="Tsering Dorjay" role="Lead guide" />
        <GuideItem name="Rigzin Angmo" role="Guide" />
      </ul>
    </section>
  );
}
