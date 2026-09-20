import { createEnv, defineConfig } from "envyra";

const schema =  defineConfig({
  NODE_ENV: {
    type: "enum",
    values: ["development", "test", "production"],
    default: "development",
    description: "Application runtime environment.",
  },
  PORT: {
    type: "number",
    default: 5000,
    description: "HTTP port the server listens on.",
  },
  DB_URI: {
    default: "mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true",
    description: "MongoDB connection string.",
  },
  DB_NAME: {
    default: "beseen",
    description: "MongoDB database name.",
  },
  STELLAR_NETWORK: {
    type: "enum",
    values: ["public", "testnet"],
    default: "testnet",
    description: "Stellar network to operate on.",
  },
  STELLAR_RPC_URL: {
    type: "url",
    default: "https://soroban-testnet.stellar.org",
    description: "Soroban RPC endpoint URL.",
  },
  BESEEN_CONTRACT_ID: {
    description: "BeSeen Soroban contract ID (starts with C).",
    example: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  },
  BESEEN_RPC_SOURCE_ACCOUNT: {
    description: "Stellar source account public key used for RPC simulation (starts with G).",
    example: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV",
  },
  BESEEN_CONTRACT_START_LEDGER: {
    type: "number",
    description: "Ledger where this contract deployment was created — replace the example with the exact ledger.",
    example: "0",
  },
  BESEEN_CONTRACT_EVENT_LEDGER_BATCH_SIZE: {
    type: "number",
    default: 50_000,
    description: "How many ledgers of contract events are fetched per batch.",
  },
  BESEEN_VERIFIER_SECRET: {
    secret: true,
    description: "Stellar secret key of the verifier account (starts with S).",
    example: "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  },
  AUTH_DOMAIN: {
    default: "beseen.fi",
    description: "Domain used for authentication and token claims.",
  },
  BLUX_BASE_URL: {
    type: "url",
    default: "https://api.blux.cc",
    description: "Base URL of the Blux API.",
  },
  BLUX_APP_ID: {
    description: "Blux application ID.",
    example: "replace-with-your-blux-app-id",
  },
  BLUX_APP_SECRET: {
    secret: true,
    description: "Blux application secret.",
    example: "replace-with-your-blux-app-secret",
  },
  BLUX_VERIFICATION_TIMEOUT_MS: {
    type: "number",
    default: 5_000,
    description: "Timeout for Blux verification requests in milliseconds.",
  },
  R2_ENDPOINT: {
    type: "url",
    description: "Cloudflare R2 S3-compatible endpoint URL.",
    example: "https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com",
  },
  R2_ACCESS_KEY_ID: {
    description: "Cloudflare R2 access key ID.",
    example: "replace-with-a-new-r2-access-key-id",
  },
  R2_SECRET_ACCESS_KEY: {
    secret: true,
    description: "Cloudflare R2 secret access key.",
    example: "replace-with-a-new-r2-secret-access-key",
  },
  R2_BUCKET_NAME: {
    default: "beseen-avatars",
    description: "R2 bucket used for avatar storage.",
  },
  R2_PUBLIC_BASE_URL: {
    type: "url",
    default: "https://images.beseen.fi",
    description: "Public base URL that serves the R2 bucket content.",
  },
  R2_MAX_AVATAR_BYTES: {
    type: "number",
    default: 5_242_880,
    description: "Maximum allowed avatar upload size in bytes.",
  },
  ACCESS_TOKEN_SECRET: {
    secret: true,
    description: "Secret used to sign access tokens.",
    example: "replace-with-at-least-32-random-characters",
  },
  ACCESS_TOKEN_TTL_SECONDS: {
    type: "number",
    default: 900,
    description: "Access token lifetime in seconds.",
  },
  REFRESH_TOKEN_TTL_SECONDS: {
    type: "number",
    default: 2_592_000,
    description: "Refresh token lifetime in seconds.",
  },
  BROADCAST_DRAFT_TTL_SECONDS: {
    type: "number",
    default: 604_800,
    description: "How long broadcast drafts are kept, in seconds.",
  },
  BROADCAST_CLEANUP_INTERVAL_SECONDS: {
    type: "number",
    default: 300,
    description: "Interval between broadcast cleanup runs, in seconds.",
  },
  LOG_LEVEL: {
    type: "enum",
    values: ["fatal", "error", "warn", "info", "debug", "trace", "silent"],
    default: "info",
    description: "Logging verbosity.",
  },
});

const env = createEnv(schema, {source: "file"});

export default env;