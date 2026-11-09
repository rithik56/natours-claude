import 'server-only';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { registerModel } from '@/server/schema-helpers';

export interface ReviewFields {
  review: string;
  rating: number;
  tour: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDoc = HydratedDocument<ReviewFields>;

const schema = new Schema<ReviewFields>({}, { strict: false });

export const Review = registerModel('Review', schema);
