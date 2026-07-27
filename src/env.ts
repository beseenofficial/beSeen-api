import 'dotenv/config';
import { z } from 'zod';

const DEVELOPMENT_ACCESS_TOKEN_SECRET = 'development-only-change-this-access-token-secret';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    DB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017'),
    DB_NAME: z.string().min(1).default('beseen'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    STELLAR_NETWORK: z.enum(['public', 'testnet']).default('public'),
    AUTH_DOMAIN: z.string().min(1).default('beseen.app'),
    AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    REGISTRATION_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(1_800).default(600),
    ACCESS_TOKEN_SECRET: z.string().min(32).default(DEVELOPMENT_ACCESS_TOKEN_SECRET),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(3_600).default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(86_400)
      .max(7_776_000)
      .default(2_592_000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === 'production' &&
      value.ACCESS_TOKEN_SECRET === DEVELOPMENT_ACCESS_TOKEN_SECRET
    ) {
      context.addIssue({
        code: 'custom',
        path: ['ACCESS_TOKEN_SECRET'],
        message: 'ACCESS_TOKEN_SECRET must be changed in production',
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');

  throw new Error(`Invalid environment variables: ${issues}`);
}

export type Environment = z.infer<typeof envSchema>;

export default parsedEnv.data;
