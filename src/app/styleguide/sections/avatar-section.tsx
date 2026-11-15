import { Avatar } from '@/components/ui/avatar';
import styles from '../styleguide.module.css';

// Seed people have no photos (seed/README.md), so these show initials. A photo replaces them when a caller passes one.
export function AvatarSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-avatar">
      <h2 id="styleguide-avatar">Avatar</h2>
      <p className={styles.note}>
        Initials when there is no photo, in two sizes. A photo replaces the
        initials and never shows as a broken image.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Tsering Dorjay, medium</span>
          <Avatar name="Tsering Dorjay" size="md" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Anjali Menon, small</span>
          <Avatar name="Anjali Menon" size="sm" />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Gaurav Bisht, blank photo address
          </span>
          <Avatar name="Gaurav Bisht" photoUrl="  " size="md" />
        </li>
      </ul>
    </section>
  );
}
