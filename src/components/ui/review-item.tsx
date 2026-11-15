import { formatDate } from '@/lib/format';
import { Avatar } from './avatar';
import { ConfirmDialog } from './confirm-dialog';
import { Link } from './link';
import { StarRating } from './star-rating';
import styles from './review-item.module.css';

type ReviewDetails = {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
};

// Edit and delete come as one set: a review you can edit has an edit address and a delete action.
type ReviewControls =
  | { canEdit?: false }
  | { canEdit: true; editHref: string; onDelete: () => void };

type ReviewItemProps = ReviewDetails & ReviewControls;

// One review in the tour's list. It renders a list item, so the caller supplies the surrounding list.
// The avatar is hidden from assistive technology because the author's name is printed beside it.
export function ReviewItem(props: ReviewItemProps) {
  const { authorName, authorPhotoUrl, rating, comment, createdAt } = props;
  const dateTime =
    typeof createdAt === 'string' ? createdAt : createdAt.toISOString();

  return (
    <li className={styles.review}>
      <div className={styles.author}>
        <span aria-hidden="true" className={styles.avatar}>
          <Avatar name={authorName} photoUrl={authorPhotoUrl} size="sm" />
        </span>
        <div className={styles.identity}>
          <p className={styles.name}>{authorName}</p>
          <time className={styles.date} dateTime={dateTime}>
            {formatDate(createdAt)}
          </time>
        </div>
      </div>
      <StarRating value={rating} />
      <p className={styles.comment}>{comment}</p>
      {props.canEdit ? (
        <div className={styles.actions}>
          <Link href={props.editHref}>Edit review</Link>
          <ConfirmDialog
            triggerLabel="Delete review"
            title="Delete your review?"
            description="Your rating and comment will be removed from this tour. This cannot be undone."
            confirmLabel="Delete my review"
            onConfirm={props.onDelete}
          />
        </div>
      ) : null}
    </li>
  );
}
