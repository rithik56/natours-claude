import styles from './skip-link.module.css';

// U9: the first focusable element on every page. It stays off-screen until it takes focus.
export function SkipLink() {
  return (
    <a className={styles.skip} href="#main-content">
      Skip to main content
    </a>
  );
}
