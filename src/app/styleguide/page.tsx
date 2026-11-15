import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { ButtonSection } from './sections/button-section';
import { LinkSection } from './sections/link-section';
import { ShellSection } from './sections/shell-section';
import { TextFieldSection } from './sections/text-field-section';
import styles from './styleguide.module.css';

export default function StyleguidePage() {
  loadStyleguidePage(getConfig().APP_ENV);
  // The root layout already provides the one main landmark, so this page is a div.
  return (
    <div className={styles.page}>
      <h1>Styleguide</h1>
      <ButtonSection />
      <LinkSection />
      <TextFieldSection />
      <ShellSection />
    </div>
  );
}
