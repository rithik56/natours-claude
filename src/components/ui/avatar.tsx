import Image from 'next/image';
import styles from './avatar.module.css';

type AvatarProps = { name: string; photoUrl?: string; size?: 'sm' | 'md' };

// Pixel width for next/image, and the matching CSS length for its sizes hint (U7).
const dimensions = {
  sm: { pixels: 40, sizes: '2.5rem' },
  md: { pixels: 56, sizes: '3.5rem' },
} as const;

// The first letter of each of the first two words, so a one-word name gives one letter.
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? '')
    .join('');
}

// The wrapper carries the name, so the initials are hidden and never announced twice.
export function Avatar({ name, photoUrl, size = 'md' }: AvatarProps) {
  const { pixels, sizes } = dimensions[size];
  const src = photoUrl?.trim();
  return (
    <div
      role="img"
      aria-label={name}
      className={`${styles.avatar} ${styles[size]}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={pixels}
          height={pixels}
          sizes={sizes}
          className={styles.photo}
        />
      ) : (
        <div aria-hidden="true" className={styles.initials}>
          {initialsOf(name)}
        </div>
      )}
    </div>
  );
}
