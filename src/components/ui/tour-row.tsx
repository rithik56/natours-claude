import Image from 'next/image';
import { formatDate } from '@/lib/format';
import { DifficultySymbol } from './difficulty-symbol';
import { Link } from './link';
import { Price } from './price';
import styles from './tour-row.module.css';

type TourRowProps = {
  name: string;
  location: string;
  photoUrl: string;
  lengthDays: number;
  difficulty: 'easy' | 'medium' | 'difficult';
  /** Omitted when the tour has no upcoming departure (C8). */
  startDate?: Date | string;
  priceRupees: number;
  href: string;
  /** C2: the first visible photo on a page is preloaded; every other row stays lazy. */
  preload?: boolean;
};

// One tour in the overview list. The whole row is the link; the photo's alt is empty because the name beside it already labels the link.
export function TourRow({
  name,
  location,
  photoUrl,
  lengthDays,
  difficulty,
  startDate,
  priceRupees,
  href,
  preload = false,
}: TourRowProps) {
  const days = lengthDays === 1 ? '1 day' : `${lengthDays} days`;

  return (
    <li className={styles.row}>
      <Link href={href} className={styles.link}>
        <span className={styles.photo}>
          <Image
            src={photoUrl}
            alt=""
            fill
            sizes="(min-width: 64em) 10rem, 7rem"
            className={styles.image}
            preload={preload}
            // C2: a preloaded photo is eager and high priority; every other photo stays lazy.
            loading={preload ? 'eager' : 'lazy'}
            fetchPriority={preload ? 'high' : undefined}
          />
        </span>
        <div className={styles.body}>
          <h2 className={styles.name}>{name}</h2>
          <span className={styles.region}>{location}</span>
          <span className={styles.meta}>
            <DifficultySymbol level={difficulty} />
            <span>{days}</span>
          </span>
        </div>
        <div className={styles.summary}>
          {startDate === undefined ? (
            <span className={styles.date}>No upcoming dates</span>
          ) : (
            <time
              dateTime={
                typeof startDate === 'string'
                  ? startDate
                  : startDate.toISOString()
              }
              className={styles.date}
            >
              {formatDate(startDate)}
            </time>
          )}
          <Price rupees={priceRupees} />
        </div>
      </Link>
    </li>
  );
}
