import { Link } from './link';
import styles from './photo-credits.module.css';

type PhotoCredit = {
  authorName: string;
  /** Optional: the seed has no author pages, so an author without one is plain text (C7). */
  authorUrl?: string;
  licenceName: string;
  licenceUrl: string;
};

type PhotoCreditsProps = { credits: PhotoCredit[] };

// copy.md's credit wording: "Photo by {author}, {licence}". The licence always links out; the author links only when there is a page for it.
// Link opens each one in a new tab with rel="noopener noreferrer" (T-03-10). The list is static, so each row is keyed by its position (C7).
export function PhotoCredits({ credits }: PhotoCreditsProps) {
  return (
    <ul className={styles.credits}>
      {credits.map((credit, index) => (
        <li key={index} className={styles.credit}>
          Photo by{' '}
          {credit.authorUrl ? (
            <Link href={credit.authorUrl}>{credit.authorName}</Link>
          ) : (
            credit.authorName
          )}
          , <Link href={credit.licenceUrl}>{credit.licenceName}</Link>
        </li>
      ))}
    </ul>
  );
}
