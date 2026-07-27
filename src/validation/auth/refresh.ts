import { z } from 'zod';

const refreshBodySchema = z
  .object({
    refreshToken: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{43}$/, 'Refresh token must be a 32-byte base64url value'),
  })
  .strict();

type RefreshBody = z.infer<typeof refreshBodySchema>;

export default refreshBodySchema;
export type { RefreshBody };
