import { Button } from '@/components/ui/button';
import styles from '../styleguide.module.css';

const variants = [
  { variant: 'primary', name: 'Primary', label: 'Book this tour' },
  { variant: 'secondary', name: 'Secondary', label: 'View tour' },
  { variant: 'quiet', name: 'Quiet', label: 'Clear filters' },
] as const;

// Hover, focus and active are pseudo-classes, so each state is shown on a live button to try by hand (U5).
const states = [
  { name: 'default', hint: 'At rest.', disabled: false },
  { name: 'hover', hint: 'Point at the button.', disabled: false },
  { name: 'focus', hint: 'Press Tab until the ring appears.', disabled: false },
  { name: 'active', hint: 'Press and hold.', disabled: false },
  { name: 'disabled', hint: 'Cannot be pressed.', disabled: true },
] as const;

export function ButtonSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-button">
      <h2 id="styleguide-button">Button</h2>
      <p className={styles.note}>
        Three variants, each in five states. The touch target is at least 44 by
        44 pixels.
      </p>
      {variants.map(({ variant, name, label }) => (
        <div key={variant}>
          <h3>{name}</h3>
          <ul className={styles.states}>
            {states.map((state) => (
              <li key={state.name} className={styles.state}>
                <span className={styles.label}>
                  {name} button, {state.name}. {state.hint}
                </span>
                <Button variant={variant} disabled={state.disabled}>
                  {label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
