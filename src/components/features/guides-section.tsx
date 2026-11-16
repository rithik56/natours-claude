import { GuideItem } from '@/components/ui/guide-item';
import { Skeleton } from '@/components/ui/skeleton';
import type { TourDetail } from '@/server/modules/tours/dto';
import { getGuides } from '@/server/modules/tours/service';
import { getDeps } from '@/server/deps';
import type { Role } from '@/server/roles';
import styles from './guides-section.module.css';

/** The label under a guide's name: the lead guide is named so, and every other guide is "Guide" (B12). */
export function guideRoleLabel(role: Role): string {
  return role === 'lead-guide' ? 'Lead guide' : 'Guide';
}

/**
 * The placeholder for the guides list while it streams: two guide-item skeletons in the same list
 * as the real guides, so the list keeps its box when the names arrive (R4).
 */
export function GuidesFallback() {
  return (
    <ul className={styles.list}>
      {[0, 1].map((index) => (
        <li key={index}>
          <Skeleton variant="guide-item" />
        </li>
      ))}
    </ul>
  );
}

type GuidesSectionProps = { tour: Pick<TourDetail, 'id' | 'guideIds'> };

/**
 * The tour's guides, the lead guide first (B12). It reads only its own data, so it can stream in
 * beside the booking panel and the reviews without waiting for either.
 */
export async function GuidesSection({ tour }: GuidesSectionProps) {
  const guides = await getGuides(tour.id, tour.guideIds);
  return (
    <ul className={styles.list}>
      {guides.map((guide) => (
        <GuideItem
          key={guide.id}
          name={guide.name}
          photoUrl={
            guide.photo ? getDeps().storage.urlFor(guide.photo) : undefined
          }
          role={guideRoleLabel(guide.role)}
        />
      ))}
    </ul>
  );
}
