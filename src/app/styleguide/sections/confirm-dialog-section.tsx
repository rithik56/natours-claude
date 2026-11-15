'use client';
// client: the section passes an onConfirm callback, which a Server Component cannot send to a Client Component

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import styles from '../styleguide.module.css';

const DONE = 'Deactivation confirmed.';

export function ConfirmDialogSection() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-confirm-dialog"
    >
      <h2 id="styleguide-confirm-dialog">Confirm dialog</h2>
      <p className={styles.note}>
        Cancel has focus when the dialog opens, so pressing Enter cancels.
        Escape closes it, and a click outside it does nothing. Only the outlined
        button runs the action.
      </p>
      <ConfirmDialog
        triggerLabel="Deactivate account"
        title="Deactivate your account?"
        description="You will be signed out and will not be able to log in again with this account."
        confirmLabel="Deactivate my account"
        onConfirm={() => setConfirmed(true)}
      />
      <p role="status" className={styles.note}>
        {confirmed ? DONE : null}
      </p>
    </section>
  );
}
