import { toIstDay } from '@/lib/ist';
import { TourRow } from '@/components/ui/tour-row';
import { now } from '@/server/clock';
import { getDeps } from '@/server/deps';
import { nextBookableDate } from '@/server/modules/tours/catalogue-query';
import { list } from '@/server/modules/tours/service';

// D-03: `/` shows the first twelve tours in rating order. The page calls list() directly (R3), never /api.
export default async function HomePage() {
  const { items } = await list({
    sort: ['-ratingsAverage'],
    page: 1,
    limit: 12,
    clampPage: true,
  });
  const today = toIstDay(now());

  return (
    <div>
      <h1>Find your next trip</h1>
      <ul>
        {items.map((tour) => (
          <TourRow
            key={tour.id}
            name={tour.name}
            location={tour.startLocation.address}
            photoUrl={getDeps().storage.urlFor(tour.imageCover)}
            lengthDays={tour.duration}
            difficulty={tour.difficulty}
            startDate={nextBookableDate(tour.startDates, today) ?? undefined}
            priceRupees={tour.price}
            href={`/tour/${tour.slug}`}
          />
        ))}
      </ul>
    </div>
  );
}
