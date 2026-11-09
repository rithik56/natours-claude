import 'server-only';
import { Schema, type HydratedDocument, type Types } from 'mongoose';
import { registerModel } from '@/server/schema-helpers';

export interface TourFields {
  name: string;
  slug: string;
  duration: number;
  maxGroupSize: number;
  difficulty: 'easy' | 'medium' | 'difficult';
  ratingsAverage: number;
  ratingsQuantity: number;
  price: number;
  summary: string;
  description?: string;
  imageCover: string;
  images: string[];
  photoCredits: Array<{
    file: string;
    title: string;
    author: string;
    license: string;
    licenseUrl: string;
    sourceUrl: string;
  }>;
  startDates: Date[];
  startLocation: {
    type: 'Point';
    coordinates: number[];
    address: string;
    description: string;
  };
  locations: Array<{
    type: 'Point';
    coordinates: number[];
    description: string;
    day: number;
  }>;
  guides: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type TourDoc = HydratedDocument<TourFields>;

const schema = new Schema<TourFields>({}, { strict: false });

export const Tour = registerModel('Tour', schema);
