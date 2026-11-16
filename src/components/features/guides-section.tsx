import { GuideItem } from '@/components/ui/guide-item';
import type { TourDetail } from '@/server/modules/tours/dto';
import { getGuides } from '@/server/modules/tours/service';
import { getDeps } from '@/server/deps';
import type { Role } from '@/server/roles';
import styles from './guides-section.module.css';

/** The label under a guide's name: the lead guide is named so, and every other guide is "Guide" (B12). */
export function guideRoleLabel(role: Role): string {
  return role === 'lead-guide' ? 'Lead guide' : 'Guide';
}

type GuidesSectionProps = { tour: Pick<TourDetail, 'id' | 'guideIds'> };

/**
 * The tour's guides, the lead guide first (B12). It reads only its own data, so the page starts its
 * read together with the booking panel and the reviews (ADR 0039).
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
