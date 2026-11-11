'use client';
// client: the disclosure needs open and closed state, and its button exists only once JavaScript has run (U19)
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import styles from './mobile-menu.module.css';

type MobileMenuProps = { links: ReactNode };

const subscribe = () => () => {};

// The server render and the first client render both see false, so the plain list is the no-JS fallback.
export function MobileMenu({ links }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const enhanced = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const navClass = [
    styles.nav,
    enhanced ? styles.enhanced : '',
    isOpen ? styles.open : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {enhanced ? (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={isOpen}
          aria-controls="site-nav"
          onClick={() => setIsOpen((open) => !open)}
        >
          Menu
        </button>
      ) : null}
      <nav id="site-nav" aria-label="Main" className={navClass}>
        {links}
      </nav>
    </>
  );
}
