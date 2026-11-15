import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { AlertSection } from './sections/alert-section';
import { AvatarSection } from './sections/avatar-section';
import { ButtonSection } from './sections/button-section';
import { DifficultySymbolSection } from './sections/difficulty-symbol-section';
import { PriceSection } from './sections/price-section';
import { ShellSection } from './sections/shell-section';
import styles from './styleguide.module.css';

export default function StyleguidePage() {
  loadStyleguidePage(getConfig().APP_ENV);
  // The root layout already provides the one main landmark, so this page is a div.
  return (
    <div className={styles.page}>
      <h1>Styleguide</h1>
      <ButtonSection />
      <PriceSection />
      <DifficultySymbolSection />
      <AvatarSection />
      <AlertSection />
      <ShellSection />
    </div>
  );
}
