import Link from 'next/link';
import { MobileMenu } from './mobile-menu';
import { ShellNavLinks } from './shell-nav-links';
import styles from './header.module.css';

type HeaderProps = { isLoggedIn: boolean };

// U19: the nav is a plain list in the DOM at every width. MobileMenu adds the disclosure button once JavaScript has run.
export function Header({ isLoggedIn }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/">
          Natours
        </Link>
        <MobileMenu
          links={
            <ul className={styles.list}>
              <ShellNavLinks isLoggedIn={isLoggedIn} />
            </ul>
          }
        />
      </div>
    </header>
  );
}
