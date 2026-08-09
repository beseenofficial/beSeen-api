import User from '../../models/User';
import { RESERVED_USERNAMES } from '../../constant/user';
import type { UsernameAvailabilityResult } from '../../types/user';
import { usernameSchema } from '../../validation/user/profileFields';

const checkUsernameAvailability = async (input: string): Promise<UsernameAvailabilityResult> => {
  const normalizedUsername = input.trim().toLowerCase();

  if (RESERVED_USERNAMES.some((reserved) => reserved === normalizedUsername)) {
    return { username: normalizedUsername, available: false, reason: 'reserved' };
  }

  const parsedUsername = usernameSchema.safeParse(normalizedUsername);

  if (!parsedUsername.success) {
    return { username: normalizedUsername, available: false, reason: 'invalid' };
  }

  const existingUser = await User.exists({ username: parsedUsername.data });

  return {
    username: parsedUsername.data,
    available: !existingUser,
    reason: existingUser ? 'taken' : null,
  };
};

export default checkUsernameAvailability;
