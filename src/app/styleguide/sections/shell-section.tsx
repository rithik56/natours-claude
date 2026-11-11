import { Footer } from '@/components/ui/footer';
import { Header } from '@/components/ui/header';
import styles from '../styleguide.module.css';

// The header and footer on their own, logged out, so the styleguide shows them without nesting a second page's chrome.
export function ShellSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-shell">
      <h2 id="styleguide-shell">Shell</h2>
      <p className={styles.note}>
        The header and footer as every page shows them, logged out.
      </p>
      <h3>Header</h3>
      <Header isLoggedIn={false} />
      <h3>Footer</h3>
      <Footer isLoggedIn={false} currentYear={new Date().getFullYear()} />
    </section>
  );
}
