import 'server-only';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { registerModel } from '@/server/schema-helpers';

export interface BookingFields {
  tour: Types.ObjectId;
  user: Types.ObjectId;
  price: number;
  currency: 'inr';
  startDate: Date;
  stripeSessionId?: string;
  status: 'paid' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDoc = HydratedDocument<BookingFields>;

const schema = new Schema<BookingFields>({}, { strict: false });

export const Booking = registerModel('Booking', schema);
