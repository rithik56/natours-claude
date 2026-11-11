import type { ComponentPropsWithoutRef } from 'react';
import styles from './button.module.css';

type ButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'className'> & {
  variant?: 'primary' | 'secondary' | 'quiet';
};

// A plain button never submits a form by accident: callers pass type="submit" when they mean it.
export function Button({
  variant = 'primary',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={`${styles.button} ${styles[variant]}`}
    />
  );
}
