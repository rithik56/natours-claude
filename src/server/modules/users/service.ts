import 'server-only';
import { Types } from 'mongoose';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { AppError } from '@/server/errors';
import { toPublicUser, type PublicUser } from './dto';
import { User, type UserRecord } from './model';

type PublicRecord = Pick<UserRecord, '_id' | 'name' | 'photo' | 'role'>;

/**
 * Finds an active user by id. The session reads this on every request, so a
 * deactivated user or a changed role takes effect at once (S6).
 *
 * @param id - The user id as a string, usually from a session token.
 * @returns The user without password, reset fields or active flag, and with
 * `passwordChangedAt`; or null when the id is malformed, unknown or deactivated.
 * @throws AppError SERVICE_UNAVAILABLE when the database is unreachable.
 * Nothing else is thrown for a missing or malformed id.
 */
export async function findActiveById(id: string): Promise<UserRecord | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await connectDb();
  try {
    return await User.findOne({ _id: id, active: { $ne: false } })
      .select('-__v')
      .lean<UserRecord>();
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}

/**
 * Reads the public fields of the active users among `ids`, for tour guides (B12, S3).
 * Only name, photo and role are selected, and each user maps through `toPublicUser`,
 * so no email or password field can reach a caller. Ids that are malformed or
 * unknown, and deactivated users, are left out. The order is not kept here; the
 * caller orders them.
 *
 * @param ids - User ids as strings, usually a tour's guide ids.
 * @returns The public users found, in no particular order; [] when none match.
 * @throws AppError SERVICE_UNAVAILABLE when the database is unreachable.
 */
export async function findActivePublicByIds(
  ids: string[],
): Promise<PublicUser[]> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return [];
  await connectDb();
  try {
    const records = await User.find({
      _id: { $in: valid },
      active: { $ne: false },
    })
      .select('name photo role')
      .lean<PublicRecord[]>();
    return records.map(toPublicUser);
  } catch (error) {
    if (!isDbUnavailableError(error)) throw error;
    const unavailable = new AppError('SERVICE_UNAVAILABLE');
    unavailable.cause = error;
    throw unavailable;
  }
}
