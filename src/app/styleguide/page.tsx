import { getConfig } from '@/server/config';
import { loadStyleguidePage } from './gate';
import { AlertSection } from './sections/alert-section';
import { AvatarSection } from './sections/avatar-section';
import { BookingPanelSection } from './sections/booking-panel-section';
import { ButtonSection } from './sections/button-section';
import { CheckboxSection } from './sections/checkbox-section';
import { ConfirmDialogSection } from './sections/confirm-dialog-section';
import { DifficultySymbolSection } from './sections/difficulty-symbol-section';
import { EmptyStateSection } from './sections/empty-state-section';
import { FactsStripSection } from './sections/facts-strip-section';
import { FileInputSection } from './sections/file-input-section';
import { GuideItemSection } from './sections/guide-item-section';
import { ItinerarySection } from './sections/itinerary-section';
import { LinkSection } from './sections/link-section';
import { MapFrameSection } from './sections/map-frame-section';
import { PaginationSection } from './sections/pagination-section';
import { PhotoCreditsSection } from './sections/photo-credits-section';
import { PriceSection } from './sections/price-section';
import { ReviewFormSection } from './sections/review-form-section';
import { ReviewItemSection } from './sections/review-item-section';
import { SelectSection } from './sections/select-section';
import { ShellSection } from './sections/shell-section';
import { SkeletonSection } from './sections/skeleton-section';
import { StarRatingSection } from './sections/star-rating-section';
import { StartDateSelectSection } from './sections/start-date-select-section';
import { TextFieldSection } from './sections/text-field-section';
import { ToastSection } from './sections/toast-section';
import { TourRowSection } from './sections/tour-row-section';
import styles from './styleguide.module.css';

// Each section component renders its own <section> and an <h2> whose id is the anchor below.
// Plain #fragment links need no JavaScript.
const sections = [
  { id: 'styleguide-button', label: 'Button', Section: ButtonSection },
  { id: 'styleguide-link', label: 'Link', Section: LinkSection },
  {
    id: 'styleguide-text-field',
    label: 'Text field',
    Section: TextFieldSection,
  },
  { id: 'styleguide-checkbox', label: 'Checkbox', Section: CheckboxSection },
  { id: 'styleguide-select', label: 'Select', Section: SelectSection },
  { id: 'styleguide-price', label: 'Price', Section: PriceSection },
  {
    id: 'styleguide-difficulty',
    label: 'Difficulty',
    Section: DifficultySymbolSection,
  },
  { id: 'styleguide-avatar', label: 'Avatar', Section: AvatarSection },
  { id: 'styleguide-alert', label: 'Alert', Section: AlertSection },
  { id: 'styleguide-toast', label: 'Toast', Section: ToastSection },
  { id: 'styleguide-tour-row', label: 'Tour row', Section: TourRowSection },
  {
    id: 'styleguide-facts-strip',
    label: 'Facts strip',
    Section: FactsStripSection,
  },
  { id: 'styleguide-itinerary', label: 'Itinerary', Section: ItinerarySection },
  {
    id: 'styleguide-pagination',
    label: 'Pagination',
    Section: PaginationSection,
  },
  {
    id: 'styleguide-photo-credits',
    label: 'Photo credits',
    Section: PhotoCreditsSection,
  },
  { id: 'styleguide-map-frame', label: 'Map frame', Section: MapFrameSection },
  {
    id: 'styleguide-booking-panel',
    label: 'Booking panel',
    Section: BookingPanelSection,
  },
  {
    id: 'styleguide-confirm-dialog',
    label: 'Confirm dialog',
    Section: ConfirmDialogSection,
  },
  { id: 'styleguide-shell', label: 'Shell', Section: ShellSection },
  {
    id: 'styleguide-file-input',
    label: 'File input',
    Section: FileInputSection,
  },
  {
    id: 'styleguide-start-date-select',
    label: 'Start date select',
    Section: StartDateSelectSection,
  },
  {
    id: 'styleguide-star-rating',
    label: 'Star rating',
    Section: StarRatingSection,
  },
  {
    id: 'styleguide-review-item',
    label: 'Review item',
    Section: ReviewItemSection,
  },
  {
    id: 'styleguide-review-form',
    label: 'Review form',
    Section: ReviewFormSection,
  },
  {
    id: 'styleguide-guide-item',
    label: 'Guide item',
    Section: GuideItemSection,
  },
  {
    id: 'styleguide-empty-state',
    label: 'Empty state',
    Section: EmptyStateSection,
  },
  { id: 'styleguide-skeleton', label: 'Skeleton', Section: SkeletonSection },
];

export default function StyleguidePage() {
  loadStyleguidePage(getConfig().APP_ENV);
  // The root layout already provides the one main landmark, so this page is a div.
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Styleguide</h1>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Styleguide sections">
          <ul className={styles.links}>
            {sections.map(({ id, label }) => (
              <li key={id}>
                <a className={styles.link} href={`#${id}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.content}>
          {sections.map(({ id, Section }) => (
            <Section key={id} />
          ))}
        </div>
      </div>
    </div>
  );
}
