import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { BookingPanelSection } from './sections/booking-panel-section';
import { ButtonSection } from './sections/button-section';
import { MapFrameSection } from './sections/map-frame-section';
import { ShellSection } from './sections/shell-section';
import styles from './styleguide.module.css';

export default function StyleguidePage() {
  loadStyleguidePage(getConfig().APP_ENV);
  // The root layout already provides the one main landmark, so this page is a div.
  return (
    <div className={styles.page}>
      <h1>Styleguide</h1>
      <ButtonSection />
      <MapFrameSection />
      <BookingPanelSection />
      <ShellSection />
    </div>
  );
}
