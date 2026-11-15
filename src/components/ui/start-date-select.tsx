import { formatDate } from '@/lib/format';
import { toIstDay } from '@/lib/ist';
import styles from './start-date-select.module.css';

type StartDateSelectProps = {
  /**
   * A YYYY-MM-DD string is already an IST day (the seed convention, B19).
   * A Date is converted to its IST day for the option value.
   */
  dates: ReadonlyArray<Date | string>;
  name: string;
  label?: string;
  errorMessage?: string;
};

// Labels always come from formatDate, so the date never reads as a hand-typed string.
function toOption(date: Date | string) {
  return {
    value: typeof date === 'string' ? date : toIstDay(date),
    label: formatDate(date),
  };
}

// A Server Component. The select is native, so it submits with a plain form and works without JavaScript.
export function StartDateSelect({
  dates,
  name,
  label = 'Start date',
  errorMessage,
}: StartDateSelectProps) {
  const options = dates.map(toOption);
  const errorId = `${name}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        className={styles.select}
        disabled={options.length === 0}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage ? (
        <p id={errorId} className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
