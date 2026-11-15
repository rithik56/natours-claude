import styles from './itinerary.module.css';

type ItineraryProps = { days: { day: number; summary: string }[] };

// An itinerary is a real sequence, so it is the one place the product shows numbers: the "Day N" labels (DES-15).
// The list's own counters stay hidden, so no second number appears beside each label.
export function Itinerary({ days }: ItineraryProps) {
  return (
    <ol className={styles.itinerary}>
      {days.map(({ day, summary }) => (
        <li key={day} className={styles.step}>
          <span className={styles.day}>Day {day}</span>
          <span className={styles.summary}>{summary}</span>
        </li>
      ))}
    </ol>
  );
}
