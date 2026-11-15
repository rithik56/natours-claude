import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { AlertSection } from './sections/alert-section';
import { AvatarSection } from './sections/avatar-section';
import { BookingPanelSection } from './sections/booking-panel-section';
import { ButtonSection } from './sections/button-section';
import { CheckboxSection } from './sections/checkbox-section';
import { ConfirmDialogSection } from './sections/confirm-dialog-section';
import { DifficultySymbolSection } from './sections/difficulty-symbol-section';
import { FileInputSection } from './sections/file-input-section';
import { GuideItemSection } from './sections/guide-item-section';
import { LinkSection } from './sections/link-section';
import { MapFrameSection } from './sections/map-frame-section';
import { PriceSection } from './sections/price-section';
import { ReviewFormSection } from './sections/review-form-section';
import { ReviewItemSection } from './sections/review-item-section';
import { SelectSection } from './sections/select-section';
import { ShellSection } from './sections/shell-section';
import { StarRatingSection } from './sections/star-rating-section';
import { StartDateSelectSection } from './sections/start-date-select-section';
import { TextFieldSection } from './sections/text-field-section';
import { ToastSection } from './sections/toast-section';
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
      <CheckboxSection />
      <SelectSection />
      <PriceSection />
      <DifficultySymbolSection />
      <AvatarSection />
      <AlertSection />
      <ToastSection />
      <MapFrameSection />
      <BookingPanelSection />
      <ConfirmDialogSection />
      <ShellSection />
      <FileInputSection />
      <StartDateSelectSection />
      <StarRatingSection />
      <ReviewItemSection />
      <ReviewFormSection />
      <GuideItemSection />
    </div>
  );
}
