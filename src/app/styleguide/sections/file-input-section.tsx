import { FileInput } from '@/components/ui/file-input';
import styles from '../styleguide.module.css';

export function FileInputSection() {
  return (
    <section className={styles.section} aria-labelledby="styleguide-file-input">
      <h2 id="styleguide-file-input">File input</h2>
      <p className={styles.note}>
        Choose a JPEG, PNG or WebP photo to see its preview. Nothing uploads
        from this page.
      </p>
      <FileInput label="Tour photo" name="photo" accept="image/*" />
    </section>
  );
}
