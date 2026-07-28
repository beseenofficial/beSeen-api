import 'dotenv/config';
import { createRequire } from 'node:module';
import { z } from 'zod';

interface StellarStrKeyApi {
  StrKey: {
    isValidEd25519SecretSeed(value: string): boolean;
  };
}

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as StellarStrKeyApi;

const DEVELOPMENT_ACCESS_TOKEN_SECRET = 'development-only-change-this-access-token-secret';
const DEVELOPMENT_AUTH_SIGNING_SECRET = 'SADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP54X';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().max(65_535).default(5000),
    DB_URI: z
      .string()
      .min(1)
      .default('mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true'),
    DB_NAME: z.string().min(1).default('beseen'),
    STELLAR_NETWORK: z.enum(['public', 'testnet']).default('testnet'),
    AUTH_DOMAIN: z.string().min(1).default('beseen.app'),
    AUTH_SIGNING_SECRET: z
      .string()
      .refine(
        (value) => stellarSdk.StrKey.isValidEd25519SecretSeed(value),
        'AUTH_SIGNING_SECRET must be a valid Stellar secret seed',
      )
      .default(DEVELOPMENT_AUTH_SIGNING_SECRET),
    AUTH_CHALLENGE_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    ACCESS_TOKEN_SECRET: z.string().min(32).default(DEVELOPMENT_ACCESS_TOKEN_SECRET),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(3_600).default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(86_400)
      .max(7_776_000)
      .default(2_592_000),
    BROADCAST_DRAFT_TTL_SECONDS: z.coerce.number().int().min(3_600).max(2_592_000).default(604_800),
    BROADCAST_CLEANUP_INTERVAL_SECONDS: z.coerce.number().int().min(30).max(3_600).default(300),
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

    if (
      value.NODE_ENV === 'production' &&
      value.AUTH_SIGNING_SECRET === DEVELOPMENT_AUTH_SIGNING_SECRET
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SIGNING_SECRET'],
        message: 'AUTH_SIGNING_SECRET must be changed in production',
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
