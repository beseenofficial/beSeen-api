import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';

import env from '../../env';
import type { UserRole } from '../../constant/user';

interface AccessTokenUser {
  id: Types.ObjectId;
  role: UserRole;
}

const signAccessToken = (user: AccessTokenUser, authSessionId: Types.ObjectId): string =>
  jwt.sign(
    {
      type: 'access',
      role: user.role,
    },
    env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      subject: user.id.toString(),
      jwtid: authSessionId.toString(),
      issuer: env.AUTH_DOMAIN,
      audience: 'beseen-api',
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    },
  );

export default signAccessToken;
export type { AccessTokenUser };
