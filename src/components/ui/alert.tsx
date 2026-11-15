import type { ReactNode } from 'react';
import styles from './alert.module.css';

type AlertVariant = 'success' | 'error' | 'info';

type AlertProps = {
  variant: AlertVariant;
  children: ReactNode;
  // A caller can override the role, for example a toast that must stay in its polite region.
  role?: 'alert' | 'status';
};

const glyphs: Record<AlertVariant, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

// Only an error interrupts a reader (role alert). Success and info are status updates.
const defaultRoles: Record<AlertVariant, 'alert' | 'status'> = {
  success: 'status',
  error: 'alert',
  info: 'status',
};

// This component never writes message text. Callers pass the copy from docs/design/copy.md.
export function Alert({ variant, children, role }: AlertProps) {
  return (
    <div
      role={role ?? defaultRoles[variant]}
      className={`${styles.alert} ${styles[variant]}`}
    >
      <span aria-hidden="true" className={styles.glyph}>
        {glyphs[variant]}
      </span>
      <div className={styles.message}>{children}</div>
    </div>
  );
}
