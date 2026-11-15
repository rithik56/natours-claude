import { PhotoCredits } from '@/components/ui/photo-credits';
import styles from '../styleguide.module.css';

// Real credits from seed/CREDITS.md, one per tour cover (U27). Author and licence link to the Wikimedia Commons source and the licence text.
export function PhotoCreditsSection() {
  return (
    <section
      className={styles.section}
      aria-labelledby="styleguide-photo-credits"
    >
      <h2 id="styleguide-photo-credits">Photo credits</h2>
      <p className={styles.note}>
        Every photo&apos;s credit in the wording from copy.md. Both the author
        and the licence open in a new tab.
      </p>
      <PhotoCredits
        credits={[
          {
            authorName: 'Rohit Sharma (edited by UnpetitproleX)',
            authorUrl:
              'https://commons.wikimedia.org/wiki/File:Valley_of_flowers_national_park,_Uttarakhand,_India_03_(edit).jpg',
            licenceName: 'CC BY-SA 4.0',
            licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
          },
          {
            authorName: 'Kanthi Kiran',
            authorUrl:
              'https://commons.wikimedia.org/wiki/File:Kedarkantha_Peak.jpg',
            licenceName: 'CC BY-SA 4.0',
            licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
          },
          {
            authorName: 'Vishal Akki',
            authorUrl:
              'https://commons.wikimedia.org/wiki/File:Pangong_Tso_VM.JPG',
            licenceName: 'CC BY-SA 3.0',
            licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
          },
        ]}
      />
    </section>
  );
}
