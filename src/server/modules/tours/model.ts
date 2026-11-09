import 'server-only';
import {
  Schema,
  type HydratedDocument,
  type SchemaTypeOptions,
  type Types,
} from 'mongoose';
import { messages } from '@/lib/messages';
import { isIstMidnight } from '@/lib/ist';
import { registerModel, withUpdateValidators } from '@/server/schema-helpers';
import { slugify } from './slug';

const { validation } = messages;

const MAX_IMAGES = 3;

/** One photo's credit (U27). Every field is required. */
interface PhotoCredit {
  file: string;
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** A GeoJSON Point, with longitude first. */
interface TourPoint {
  type: 'Point';
  coordinates: number[];
}

interface TourLocation extends TourPoint {
  description: string;
  day: number;
}

interface StartLocation extends TourPoint {
  address: string;
  description: string;
}

/** Every stored field of a tour (plan.md 1.3). Prices are whole rupees (B20). */
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
  /** A storage key, not a URL. */
  imageCover: string;
  images: string[];
  photoCredits: PhotoCredit[];
  /** Each is 00:00 IST on its day (B19). */
  startDates: Date[];
  startLocation: StartLocation;
  locations: TourLocation[];
  guides: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

/** A hydrated tour document. */
export type TourDoc = HydratedDocument<TourFields>;

const wholeNumber = {
  validator: Number.isInteger,
  message: validation.invalidType,
};

function validCoordinates(value: number[] | undefined): boolean {
  if (!value || value.length !== 2) return false;
  const [longitude, latitude] = value;
  return (
    longitude !== undefined &&
    latitude !== undefined &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

const pointFields = {
  type: { type: String, enum: ['Point'], default: 'Point' as const },
  coordinates: {
    type: [Number],
    required: [true, validation.required] as [boolean, string],
    validate: { validator: validCoordinates, message: validation.invalidValue },
  },
};

const requiredText = {
  type: String,
  required: [true, validation.required],
} satisfies SchemaTypeOptions<string>;

const photoCreditSchema = new Schema<PhotoCredit>(
  {
    file: requiredText,
    title: requiredText,
    author: requiredText,
    license: requiredText,
    licenseUrl: requiredText,
    sourceUrl: requiredText,
  },
  { _id: false },
);

const startLocationSchema = new Schema<StartLocation>(
  {
    ...pointFields,
    address: requiredText,
    description: requiredText,
  },
  { _id: false },
);

const locationSchema = new Schema<TourLocation>(
  {
    ...pointFields,
    description: requiredText,
    day: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      validate: wholeNumber,
    },
  },
  { _id: false },
);

const schema = new Schema<TourFields>(
  {
    name: {
      type: String,
      required: [true, validation.required],
      unique: true,
      trim: true,
      minlength: [10, validation.tooShort(10)],
      maxlength: [40, validation.tooLong(40)],
    },
    slug: { type: String, unique: true },
    duration: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      validate: wholeNumber,
    },
    maxGroupSize: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      validate: wholeNumber,
    },
    difficulty: {
      type: String,
      required: [true, validation.required],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: validation.invalidOption,
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, validation.tooSmall(1)],
      max: [5, validation.tooBig(5)],
      set: (value: number) => Math.round(value * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
      min: [0, validation.tooSmall(0)],
      validate: wholeNumber,
    },
    price: {
      type: Number,
      required: [true, validation.required],
      min: [1, validation.tooSmall(1)],
      validate: wholeNumber,
    },
    summary: { ...requiredText, trim: true },
    description: { type: String, trim: true },
    imageCover: requiredText,
    images: {
      type: [String],
      validate: {
        validator: (value: string[]) => value.length <= MAX_IMAGES,
        message: validation.invalidValue,
      },
    },
    photoCredits: [photoCreditSchema],
    startDates: [
      {
        type: Date,
        validate: {
          validator: isIstMidnight,
          message: validation.invalidValue,
        },
      },
    ],
    startLocation: {
      type: startLocationSchema,
      required: [true, validation.required],
    },
    locations: [locationSchema],
    guides: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

schema.index({ price: 1, ratingsAverage: -1 });
schema.index({ startLocation: '2dsphere' });
schema.index({ startDates: 1 });

// The slug follows the name: set on create, regenerated on rename.
schema.pre('validate', function () {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = slugify(this.name);
  }
});

function nameInUpdate(update: unknown): string | undefined {
  if (typeof update !== 'object' || update === null || Array.isArray(update)) {
    return undefined;
  }
  const record = update as Record<string, unknown>;
  const direct = record.name;
  if (typeof direct === 'string') return direct;
  const set = record.$set;
  if (typeof set === 'object' && set !== null) {
    const named = (set as Record<string, unknown>).name;
    if (typeof named === 'string') return named;
  }
  return undefined;
}

schema.pre('findOneAndUpdate', function () {
  const name = nameInUpdate(this.getUpdate());
  if (name !== undefined) this.set({ slug: slugify(name) });
});

export const Tour = registerModel('Tour', withUpdateValidators(schema));
