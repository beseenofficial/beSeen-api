const USER_ROLES = ['user', 'moderator', 'admin'] as const;
const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;
const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'api',
  'beseen',
  'me',
  'moderator',
  'root',
  'support',
  'system',
] as const;

type UserRole = (typeof USER_ROLES)[number];
type UserStatus = (typeof USER_STATUSES)[number];

export { RESERVED_USERNAMES, USER_ROLES, USER_STATUSES };
export type { UserRole, UserStatus };
