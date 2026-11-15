import type { ComponentPropsWithoutRef } from 'react';
import { fieldErrorProps } from './field-error';
import styles from './select.module.css';

type SelectOption = { value: string; label: string };

type SelectProps = {
  label: string;
  name: string;
  options: SelectOption[];
  errorMessage?: string;
} & ComponentPropsWithoutRef<'select'>;

// U16: the same error contract as TextField, so every form control wires its error identically.
export function Select({
  label,
  name,
  options,
  errorMessage,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...rest
}: SelectProps) {
  const { errorId, ariaInvalid, ariaDescribedBy } = fieldErrorProps({
    name,
    errorMessage,
    describedBy,
    invalid,
  });

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>
        {label}
      </label>
      <select
        {...rest}
        id={name}
        name={name}
        className={styles.select}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <p id={errorId} role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
