import { Link } from './link';
import styles from './photo-credits.module.css';

type PhotoCredit = {
  authorName: string;
  authorUrl: string;
  licenceName: string;
  licenceUrl: string;
};

type PhotoCreditsProps = { credits: PhotoCredit[] };

// copy.md's credit wording: "Photo by {author}, {licence}", with both names linking out. Link opens each one in a new tab with rel="noopener noreferrer" (T-03-10).
export function PhotoCredits({ credits }: PhotoCreditsProps) {
  return (
    <ul className={styles.credits}>
      {credits.map((credit) => (
        <li key={credit.authorUrl} className={styles.credit}>
          Photo by <Link href={credit.authorUrl}>{credit.authorName}</Link>,{' '}
          <Link href={credit.licenceUrl}>{credit.licenceName}</Link>
        </li>
      ))}
    </ul>
  );
}
