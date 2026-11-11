import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { ButtonSection } from './sections/button-section';
import styles from './styleguide.module.css';

export default function StyleguidePage() {
  loadStyleguidePage(getConfig().APP_ENV);
  return (
    <main className={styles.page}>
      <h1>Styleguide</h1>
      <ButtonSection />
    </main>
  );
}
