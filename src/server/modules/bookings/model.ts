import 'server-only';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { messages } from '@/lib/messages';
import { isIstMidnight } from '@/lib/ist';
import { registerModel, withUpdateValidators } from '@/server/schema-helpers';

const { validation } = messages;

/** Every stored field of a booking (plan.md 1.3). */
export interface BookingFields {
  tour: Types.ObjectId;
  user: Types.ObjectId;
  /** A snapshot of the tour's price at checkout, in whole rupees (B20). */
  price: number;
  currency: 'inr';
  /** 00:00 IST on the departure day (B19). */
  startDate: Date;
  /** Stripe's id for the paid session. Absent for bookings that did not come through checkout. */
  stripeSessionId?: string;
  status: 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

/** A hydrated booking document. */
export type BookingDoc = HydratedDocument<BookingFields>;

const schema = new Schema<BookingFields>(
  {
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
    price: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      validate: {
        validator: Number.isInteger,
        message: validation.invalidType,
      },
    },
    currency: {
      type: String,
      enum: { values: ['inr'], message: validation.invalidOption },
      default: 'inr',
    },
    startDate: {
      type: Date,
      required: [true, validation.required],
      validate: { validator: isIstMidnight, message: validation.invalidValue },
    },
    stripeSessionId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: { values: ['paid', 'refunded'], message: validation.invalidOption },
      default: 'paid',
    },
  },
  { timestamps: true },
);

schema.index({ user: 1 });
schema.index({ tour: 1 });

export const Booking = registerModel('Booking', withUpdateValidators(schema));
