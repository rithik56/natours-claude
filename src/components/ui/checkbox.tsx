import type { ComponentPropsWithoutRef } from 'react';
import styles from './checkbox.module.css';

type CheckboxProps = {
  label: string;
  name: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'type'>;

// A real input[type=checkbox] keeps native keyboard, label and form behaviour. It covers the whole
// label, so the 44px target is the native control itself. The drawn box beside it follows the
// input's :checked, :focus-visible and :disabled states, so CSS alone shows every state (no JS).
export function Checkbox({ label, name, ...rest }: CheckboxProps) {
  return (
    <label className={styles.field}>
      <input {...rest} type="checkbox" name={name} className={styles.input} />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  );
}
