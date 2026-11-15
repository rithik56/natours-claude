'use client';
// client: the auto-dismiss timer and the open state run in the browser, so the toast can leave on its own or on Dismiss (R1)
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from './alert';
import styles from './toast.module.css';

type ToastProps = {
  message: string;
  variant?: 'success' | 'error' | 'info';
  durationMs?: number;
  onDismiss?: () => void;
};

// Long enough to read a short message, short enough not to hold the page (U25).
const defaultDurationMs = 5000;

// The region is polite because a toast reports an outcome the reader can finish first. The inner Alert is a status update for the same reason.
export function Toast({
  message,
  variant = 'info',
  durationMs = defaultDurationMs,
  onDismiss,
}: ToastProps) {
  const [isOpen, setIsOpen] = useState(true);
  // A ref keeps a fresh onDismiss from restarting the timer on every parent render.
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    onDismissRef.current?.();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(dismiss, durationMs);
    // Clearing on close as well as on unmount stops a timer from firing after a manual dismissal.
    return () => clearTimeout(timer);
  }, [isOpen, durationMs, dismiss]);

  if (!isOpen) return null;

  return (
    <div aria-live="polite" className={styles.toast}>
      <div className={styles.body}>
        <Alert variant={variant} role="status">
          {message}
        </Alert>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className={styles.close}
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
