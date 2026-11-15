import NextLink from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import styles from './link.module.css';

// External links always open in a new tab, so the target and rel are fixed here, not by callers.
type LinkProps = Omit<
  ComponentPropsWithoutRef<'a'>,
  'href' | 'target' | 'rel'
> & {
  href: string;
};

const EXTERNAL = /^https?:\/\//;

// Internal routes go through next/link for client-side navigation; external URLs get a plain anchor.
export function Link({ href, ...rest }: LinkProps) {
  if (EXTERNAL.test(href)) {
    return (
      <a
        {...rest}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      />
    );
  }
  return <NextLink {...rest} href={href} className={styles.link} />;
}
