import Link from 'next/link';
import { ShellNavLinks } from './shell-nav-links';
import styles from './footer.module.css';

type FooterProps = { isLoggedIn: boolean; currentYear: number };

// D-01: the header's nav, a photo credits link and a copyright line. No social links.
export function Footer({ isLoggedIn, currentYear }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav aria-label="Footer">
          <ul className={styles.list}>
            <ShellNavLinks isLoggedIn={isLoggedIn} />
            <li>
              <Link href="/credits">Photo credits</Link>
            </li>
          </ul>
        </nav>
        <p className={styles.copy}>© {currentYear} Natours.</p>
      </div>
    </footer>
  );
}
