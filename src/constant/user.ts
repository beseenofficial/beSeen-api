const USER_ACCOUNT_TYPES = ['regular', 'creator'] as const;
const USER_ROLES = ['user', 'moderator', 'admin'] as const;
const USER_STATUSES = ['active', 'suspended', 'deleted'] as const;

type UserAccountType = (typeof USER_ACCOUNT_TYPES)[number];
type UserRole = (typeof USER_ROLES)[number];
type UserStatus = (typeof USER_STATUSES)[number];

export { USER_ACCOUNT_TYPES, USER_ROLES, USER_STATUSES };
export type { UserAccountType, UserRole, UserStatus };
