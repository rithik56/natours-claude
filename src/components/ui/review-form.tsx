import { useId } from 'react';
import { Button } from './button';
import { fieldErrorProps } from './field-error';
import { StarRatingInput } from './star-rating-input';
import styles from './review-form.module.css';

type ReviewFormProps = {
  canReview: boolean;
  action?: string;
  commentError?: string;
};

// plan.md §4.1: a review is 1 to 1,000 characters.
const MAX_COMMENT_LENGTH = 1000;

// A plain form with no state of its own. Phase 6 wraps it with useActionState once a Server Action exists.
// canReview only hides the form. It is a safety net, not the authorization boundary: the Server Action
// re-checks the booking and the author on the server (S5).
export function ReviewForm({
  canReview,
  action,
  commentError,
}: ReviewFormProps) {
  // The field id is unique per form, so two forms on one page never share a label target.
  const commentId = `${useId()}-comment`;
  const { errorId, ariaInvalid, ariaDescribedBy } = fieldErrorProps({
    name: commentId,
    errorMessage: commentError,
  });

  if (!canReview) return null;

  return (
    <form method="post" action={action} className={styles.form}>
      <StarRatingInput name="rating" />
      <div className={styles.field}>
        <label className={styles.label} htmlFor={commentId}>
          Your review
        </label>
        <textarea
          id={commentId}
          name="comment"
          className={styles.textarea}
          rows={5}
          required
          maxLength={MAX_COMMENT_LENGTH}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
        {commentError ? (
          <p id={errorId} role="alert" className={styles.error}>
            {commentError}
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="primary">
        Post review
      </Button>
    </form>
  );
}
