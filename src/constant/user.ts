const USER_ROLES = ['user', 'moderator', 'admin'] as const;

const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;

const USER_DISCOVER_DEFAULT_LIMIT = 20;

const USER_DISCOVER_MAX_LIMIT = 50;

const USER_BIO_MAX_LENGTH = 64;

const OFFICIAL_USER_USERNAME = 'beseenfi';

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

export {
  RESERVED_USERNAMES,
  OFFICIAL_USER_USERNAME,
  USER_DISCOVER_DEFAULT_LIMIT,
  USER_DISCOVER_MAX_LIMIT,
  USER_BIO_MAX_LENGTH,
  USER_ROLES,
  USER_STATUSES,
};
export type { UserRole, UserStatus };
