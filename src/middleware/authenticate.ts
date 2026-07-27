import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { USER_ACCOUNT_TYPES, USER_ROLES } from '../constant/user';
import env from '../env';
import AuthSession from '../models/AuthSession';

const accessTokenPayloadSchema = z.object({
  sub: z.string().regex(/^[a-f\d]{24}$/i),
  jti: z.string().regex(/^[a-f\d]{24}$/i),
  type: z.literal('access'),
  role: z.enum(USER_ROLES),
  accountType: z.enum(USER_ACCOUNT_TYPES),
});

const unauthorized = (res: Parameters<RequestHandler>[1]) =>
  res.status(401).j({
    status: 'error',
    message: 'Authentication is required',
    result: { code: 'UNAUTHORIZED' },
  });

const authenticate: RequestHandler = async (req, res, next) => {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  const accessToken = match?.[1];

  if (!accessToken) {
    return unauthorized(res);
  }

  let verifiedPayload: unknown;

  try {
    verifiedPayload = jwt.verify(accessToken, env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: env.AUTH_DOMAIN,
      audience: 'beseen-api',
    });
  } catch {
    return unauthorized(res);
  }

  const payload = accessTokenPayloadSchema.safeParse(verifiedPayload);

  if (!payload.success) {
    return unauthorized(res);
  }

  try {
    const session = await AuthSession.exists({
      _id: payload.data.jti,
      user: payload.data.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return unauthorized(res);
    }

    req.auth = {
      userId: payload.data.sub,
      sessionId: payload.data.jti,
      role: payload.data.role,
      accountType: payload.data.accountType,
    };
    res.setHeader('Cache-Control', 'no-store');

    return next();
  } catch (error: unknown) {
    return next(error);
  }
};

export default authenticate;
