import 'server-only';
import { Types } from 'mongoose';
import { connectDb, isDbUnavailableError } from '@/server/db';
import { AppError } from '@/server/errors';
import { User, type UserRecord } from './model';

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
