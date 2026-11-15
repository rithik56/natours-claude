'use client';
// client: onChange hands each chosen rating to the caller, so the radios need a client boundary (R1)
import { useId } from 'react';
import styles from './star-rating-input.module.css';

type StarRatingInputProps = {
  name: string;
  legend?: string;
  defaultValue?: number;
  onChange?: (value: number) => void;
};

const values = [1, 2, 3, 4, 5] as const;

// W3C APG "Rating Radio Group": native radios give the arrow-key, Space and Tab behaviour.
// This file writes no key handling. The visible stars are aria-hidden, and each label's text stays in the accessible name.
export function StarRatingInput({
  name,
  legend = 'Rate this tour',
  defaultValue,
  onChange,
}: StarRatingInputProps) {
  const id = useId();

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div role="radiogroup" aria-label="Rating" className={styles.group}>
        {values.map((value) => {
          const inputId = `${id}-${value}`;
          return (
            <span key={value} className={styles.option}>
              <input
                id={inputId}
                className={styles.input}
                type="radio"
                name={name}
                value={value}
                defaultChecked={defaultValue === value}
                onChange={() => onChange?.(value)}
              />
              <label htmlFor={inputId} className={styles.label}>
                <span aria-hidden="true" className={styles.glyph}>
                  ★
                </span>
                <span className={styles.text}>
                  {value === 1 ? '1 star' : `${value} stars`}
                </span>
              </label>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}
