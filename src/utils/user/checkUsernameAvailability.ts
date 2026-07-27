import { RESERVED_USERNAMES } from '../../constant/user';
import User from '../../models/User';
import { usernameSchema } from '../../validation/user/profileFields';

type UsernameUnavailabilityReason = 'invalid' | 'reserved' | 'taken';

interface UsernameAvailabilityResult {
  username: string;
  available: boolean;
  reason: UsernameUnavailabilityReason | null;
}

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
export type { UsernameAvailabilityResult, UsernameUnavailabilityReason };
