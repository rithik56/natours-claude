import Image from 'next/image';
import { Link } from '@/components/ui/link';
import styles from './tour-gallery.module.css';

export type GalleryPhoto = {
  /** The photo's URL on this origin, from the storage adapter. */
  url: string;
  alt: string;
  author: string;
  licence: string;
  licenceUrl: string;
};

type TourGalleryProps = { photos: GalleryPhoto[] };

// D-09: the tour's extra photos after the description. Plain images with no JavaScript and no lightbox.
// Each carries its credit as a caption, "Photo: {author}, {licence}", with the licence linked.
export function TourGallery({ photos }: TourGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <ul className={styles.gallery}>
      {photos.map((photo) => (
        <li key={photo.url}>
          <figure className={styles.photo}>
            <div className={styles.frame}>
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                loading="lazy"
                sizes="(min-width: 64em) 15rem, 100vw"
                className={styles.image}
              />
            </div>
            <figcaption className={styles.caption}>
              Photo: {photo.author},{' '}
              <Link href={photo.licenceUrl}>{photo.licence}</Link>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
