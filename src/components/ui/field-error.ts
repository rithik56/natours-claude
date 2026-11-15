import type { ComponentPropsWithoutRef } from 'react';

type FieldErrorInput = {
  name: string;
  errorMessage?: string;
  describedBy?: string;
  invalid?: ComponentPropsWithoutRef<'input'>['aria-invalid'];
};

/**
 * U16: the one field-error contract every form control shares. A control with an
 * errorMessage is aria-invalid and described by its error, whose id is `${name}-error`.
 * The caller owns the wording; this only wires the attributes.
 */
export function fieldErrorProps({
  name,
  errorMessage,
  describedBy,
  invalid,
}: FieldErrorInput) {
  const errorId = `${name}-error`;
  return {
    errorId,
    ariaInvalid: errorMessage ? true : invalid,
    ariaDescribedBy:
      [describedBy, errorMessage ? errorId : undefined]
        .filter(Boolean)
        .join(' ') || undefined,
  };
}
