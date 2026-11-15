import { formatPrice } from '@/lib/format';
import styles from './price.module.css';

type PriceProps = { rupees: number; perPerson?: boolean };

// formatPrice is the only source of the rupee string (B20), so this component never builds one.
export function Price({ rupees, perPerson = false }: PriceProps) {
  const amount = formatPrice(rupees);
  return (
    <span className={styles.price}>
      {perPerson ? `${amount} per person` : amount}
    </span>
  );
}
