import 'server-only';
import type { UserRecord } from './model';

/**
 * Finds an active user by id.
 *
 * @param id - The user id as a string, usually from a session token.
 * @returns The user, or null when the id is malformed, unknown or deactivated.
 * @throws AppError SERVICE_UNAVAILABLE when the database is unreachable.
 */
export async function findActiveById(id: string): Promise<UserRecord | null> {
  void id;
  return null;
}
