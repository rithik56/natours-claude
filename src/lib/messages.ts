// Central user-facing wording in Indian English (DES-12). Phase 2's copy.md rewords this file.
// Each line says what happened and how to fix it, without apology or filler.

const grouped = new Intl.NumberFormat('en-IN');

export const messages = {
  errors: {
    VALIDATION_ERROR: 'Check the highlighted fields and try again.',
    UNAUTHENTICATED: 'Log in to continue.',
    INVALID_CREDENTIALS:
      'The email or password is incorrect. Check both and try again.',
    TOKEN_EXPIRED:
      'This link or session has expired. Log in again or request a new link.',
    FORBIDDEN: "Your account doesn't have access to this.",
    NOT_FOUND: "We couldn't find that.",
    CONFLICT: "That's already in use.",
    PAYLOAD_TOO_LARGE:
      'That upload is too large. Choose a smaller file and try again.',
    UNSUPPORTED_MEDIA_TYPE:
      "That format isn't supported. Check the file or request type and try again.",
    RATE_LIMITED: 'Too many attempts. Wait a few minutes and try again.',
    INTERNAL: 'Something went wrong on our side. Try again in a moment.',
    SERVICE_UNAVAILABLE:
      'Natours is unavailable right now. Try again in a few minutes.',
  },
  validation: {
    required: 'Fill in this field.',
    invalidType: "This value isn't in the right form. Check it and try again.",
    invalidEmail: 'Enter a valid email address.',
    invalidFormat:
      "This value isn't in the right format. Check it and try again.",
    invalidOption: 'Choose one of the available options.',
    invalidValue: "This value isn't allowed. Check it and try again.",
    invalidId: "That identifier isn't valid. Check it and try again.",
    unknownField: "This field isn't recognised. Remove it and try again.",
    invalidJson: "The request body isn't valid JSON. Check it and try again.",
    tooShort: (min: number) =>
      `Use at least ${grouped.format(min)} characters.`,
    tooLong: (max: number) => `Use at most ${grouped.format(max)} characters.`,
    passwordTooLong:
      'That password is too long. Use a shorter one, or fewer accented or non-English letters.',
    tooSmall: (min: number) =>
      `Enter a number that is at least ${grouped.format(min)}.`,
    tooBig: (max: number) =>
      `Enter a number that is at most ${grouped.format(max)}.`,
  },
} as const;
