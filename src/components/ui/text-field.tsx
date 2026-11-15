import type { ComponentPropsWithoutRef } from 'react';
import styles from './text-field.module.css';

type TextFieldProps = {
  label: string;
  name: string;
  errorMessage?: string;
} & ComponentPropsWithoutRef<'input'>;

// U16: an error is linked to its input through aria-invalid and aria-describedby.
// The caller owns the wording and passes it in; this component never writes copy itself.
export function TextField({
  label,
  name,
  errorMessage,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: TextFieldProps) {
  const errorId = `${name}-error`;
  const describedByIds =
    [describedBy, errorMessage ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
      </label>
      <input
        {...rest}
        id={name}
        name={name}
        className={styles.input}
        aria-invalid={errorMessage ? true : ariaInvalid}
        aria-describedby={describedByIds}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
