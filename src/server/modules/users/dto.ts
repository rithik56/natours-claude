import 'server-only';
import type { Role } from '@/server/roles';
import type { UserRecord } from './model';

/** What guides and review authors look like to anyone. It has no email (SEC-10). */
export type PublicUser = {
  id: string;
  name: string;
  photo: string | null;
  role: Role;
};

/** What a logged-in user sees of themselves. */
export type SelfUser = PublicUser & { email: string };

type PublicSource = Pick<UserRecord, '_id' | 'name' | 'photo' | 'role'>;
type SelfSource = PublicSource & Pick<UserRecord, 'email'>;

/** Maps a user for public pages and public API responses (S3, R6). */
export function toPublicUser(user: PublicSource): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    photo: user.photo ?? null,
    role: user.role,
  };
}

/** Maps a user for their own account pages and `/me` (S3, R6). */
export function toSelf(user: SelfSource): SelfUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo ?? null,
  };
}
