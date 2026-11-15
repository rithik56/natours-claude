import { Price } from '@/components/ui/price';
import styles from '../styleguide.module.css';

// Real seed prices. Amounts come from formatPrice, which groups digits the Indian way (B20).
export function PriceSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-price">
      <h2 id="styleguide-price">Price</h2>
      <p className={styles.note}>
        Whole rupees with Indian digit grouping. A tour page adds the words per
        person to the amount.
      </p>
      <ul className={styles.states}>
        <li className={styles.state}>
          <span className={styles.label}>Kerala Backwaters and Hills</span>
          <Price rupees={24999} />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>Ladakh High Passes</span>
          <Price rupees={42999} />
        </li>
        <li className={styles.state}>
          <span className={styles.label}>
            Valley of Flowers Trek, per person
          </span>
          <Price rupees={18999} perPerson />
        </li>
      </ul>
    </section>
  );
}
