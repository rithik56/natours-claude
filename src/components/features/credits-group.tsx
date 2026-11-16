import Image from 'next/image';
import { Link } from '@/components/ui/link';
import { getDeps } from '@/server/deps';
import type { CreditGroup } from '@/server/modules/tours/dto';
import styles from './credits-group.module.css';

type CreditsGroupProps = { group: CreditGroup };

/**
 * One tour's block on `/credits` (U27, D-10): the tour name as an h2 linked to its page,
 * then one row per photo, the cover first. Each row has a lazy thumbnail, the photo title
 * linked to its source page, and "Photo by {author}, {licence}" with the licence linked.
 * The author is plain text, because the seed has no author page (C7). A Server Component
 * with no client JavaScript, so it works with JavaScript off.
 */
export function CreditsGroup({ group }: CreditsGroupProps) {
  return (
    <section className={styles.group} aria-labelledby={`credits-${group.slug}`}>
      <h2 id={`credits-${group.slug}`} className={styles.heading}>
        <Link href={`/tour/${group.slug}`}>{group.name}</Link>
      </h2>
      <ul className={styles.list}>
        {group.photos.map((photo) => (
          <li key={photo.key} className={styles.row}>
            <span className={styles.thumb}>
              {/* The title beside it names the photo, so the thumbnail is decorative. */}
              <Image
                src={getDeps().storage.urlFor(photo.key)}
                alt=""
                fill
                loading="lazy"
                sizes="4rem"
                className={styles.image}
              />
            </span>
            <span className={styles.text}>
              <Link href={photo.sourceUrl} className={styles.title}>
                {photo.title}
              </Link>
              <span className={styles.credit}>
                Photo by {photo.author},{' '}
                <Link href={photo.licenseUrl}>{photo.license}</Link>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
