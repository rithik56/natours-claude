'use client';
// client: showModal() is an imperative DOM call on a ref, so the dialog needs a client boundary (R1)

import { useId, useRef, type FormEvent } from 'react';
import { Button } from './button';
import styles from './confirm-dialog.module.css';

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

// The browser supplies the modal behaviour: the top layer, the inert page, Escape to close and the
// focus trap. Nothing here handles keys or focus by hand. Cancel comes first in the form, so it is
// the first focusable control and the default button, and the destructive button never takes focus
// on open. A click on the backdrop does nothing, because no closedby attribute is set.
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  // method="dialog" closes the dialog on any submit. Only the confirm button runs the action.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const { submitter } = event.nativeEvent as SubmitEvent;
    if (
      submitter instanceof HTMLButtonElement &&
      submitter.value === 'confirm'
    ) {
      onConfirm();
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => dialogRef.current?.showModal()}
      >
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <form method="dialog" className={styles.form} onSubmit={handleSubmit}>
          <h2 id={`${id}-title`} className={styles.title}>
            {title}
          </h2>
          <p id={`${id}-description`} className={styles.description}>
            {description}
          </p>
          <div className={styles.actions}>
            <Button type="submit" value="cancel" variant="secondary" autoFocus>
              Cancel
            </Button>
            <button
              type="submit"
              value="confirm"
              className={styles.destructive}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
