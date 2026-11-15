import { Link } from './link';
import styles from './empty-state.module.css';

type EmptyStateProps = {
  message: string;
  action: { label: string; href: string };
};

// docs/design/copy.md: state the fact, then name the one action that resolves it.
// The caller passes both strings from copy.md; this component writes no copy of its own.
// A blank message or action would leave a dead end, so it is refused rather than rendered.
export function EmptyState({ message, action }: EmptyStateProps) {
  if (!message.trim() || !action.label.trim() || !action.href.trim()) {
    throw new RangeError('An empty state needs a message and an action');
  }

  return (
    <p className={styles.empty}>
      {message} <Link href={action.href}>{action.label}</Link>
    </p>
  );
}
