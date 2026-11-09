import 'server-only';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { messages } from '@/lib/messages';
import { registerModel, withUpdateValidators } from '@/server/schema-helpers';

const { validation } = messages;

/** Every stored field of a review (plan.md 1.3). */
export interface ReviewFields {
  review: string;
  rating: number;
  tour: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** A hydrated review document. */
export type ReviewDoc = HydratedDocument<ReviewFields>;

const schema = new Schema<ReviewFields>(
  {
    review: {
      type: String,
      required: [true, validation.required],
      trim: true,
      minlength: [1, validation.required],
      maxlength: [1000, validation.tooLong(1000)],
    },
    rating: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      max: [5, validation.tooBig(5)],
      validate: {
        validator: Number.isInteger,
        message: validation.invalidType,
      },
    },
    tour: {
      type: Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, validation.required],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, validation.required],
    },
  },
  { timestamps: true },
);

// One review per traveller per tour.
schema.index({ tour: 1, user: 1 }, { unique: true });

// Recalculating the tour's rating is the Phase 6 service's job (B6), so no hooks.
export const Review = registerModel('Review', withUpdateValidators(schema));
