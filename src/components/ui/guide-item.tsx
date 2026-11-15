import { Avatar } from './avatar';
import styles from './guide-item.module.css';

type GuideItemProps = { name: string; photoUrl?: string; role: string };

// A guide on the tour page: who they are and what they do, nothing to rate or act on.
// It renders a list item, so the caller supplies the surrounding list.
export function GuideItem({ name, photoUrl, role }: GuideItemProps) {
  return (
    <li className={styles.guide}>
      <span aria-hidden="true" className={styles.avatar}>
        <Avatar name={name} photoUrl={photoUrl} size="md" />
      </span>
      <div className={styles.identity}>
        <p className={styles.name}>{name}</p>
        <p className={styles.role}>{role}</p>
      </div>
    </li>
  );
}
