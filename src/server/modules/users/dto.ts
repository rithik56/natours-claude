import 'server-only';
import type { Role } from '@/server/roles';
import type { UserRecord } from './model';

export type PublicUser = {
  id: string;
  name: string;
  photo: string | null;
  role: Role;
};

export type SelfUser = PublicUser & { email: string };

type PublicSource = Pick<UserRecord, '_id' | 'name' | 'photo' | 'role'>;
type SelfSource = PublicSource & Pick<UserRecord, 'email'>;

export function toPublicUser(user: PublicSource): PublicUser {
  return user as unknown as PublicUser;
}

export function toSelf(user: SelfSource): SelfUser {
  return user as unknown as SelfUser;
}
