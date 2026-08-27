# BeSeen API

BeSeen API is the backend service for the BeSeen platform. It provides wallet-based authentication, public user profiles, token-based social connections, discovery ranking, encrypted broadcasts, and encrypted direct messaging.

The service is built with Node.js, TypeScript, Express, MongoDB, and Mongoose. It exposes a versioned REST API with an OpenAPI specification and an interactive Swagger UI.

## Features

- Stellar wallet-based registration and authentication
- Short-lived access tokens with refresh-session rotation
- Replay-resistant signed login proofs
- Public profiles and avatar storage through Cloudflare R2
- Username availability and profile management
- User tokens, token ownership, and follower counts
- Ranked user discovery based on bounded engagement signals
- Authenticated activity heartbeat tracking
- Client-side encrypted broadcasts with per-recipient wrapped keys
- Client-side encrypted direct messages and read receipts
- Idempotent message delivery and token acquisition
- Optional message bounties
- Request validation, rate limiting, structured logging, and secure HTTP defaults
- OpenAPI documentation
- Automatic database migrations during application startup

## Technology

- Node.js 22
- TypeScript
- Express 5
- MongoDB 8 with replica-set transactions
- Mongoose
- Zod
- Pino
- Vitest
- Docker and Docker Compose

## Requirements

Choose one of the following setups:

- Docker Engine with Docker Compose; or
- Node.js 22+, npm, and a MongoDB replica set

MongoDB must run as a replica set because several application operations use transactions. The included Compose configuration initializes a single-node `rs0` replica set automatically.

## Quick start with Docker

Docker Compose is the recommended way to run the complete local stack.

1. Create the environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace all placeholder credentials in `.env`, especially:

   - `ACCESS_TOKEN_SECRET`
   - `BLUX_APP_ID`
   - `BLUX_APP_SECRET`
   - `R2_ENDPOINT`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_PUBLIC_BASE_URL`

3. Build and start the services:

   ```bash
   docker compose up --build
   ```

4. Verify the API:

   ```http
   GET http://127.0.0.1:3000/v1/health
   ```

The Compose stack exposes the API on `127.0.0.1:3000` and MongoDB on `127.0.0.1:27017`. MongoDB data is retained in named Docker volumes.

To run the stack in the background:

```bash
docker compose up --build -d
```

To follow API logs:

```bash
docker compose logs -f api
```

To stop the services without deleting database data:

```bash
docker compose down
```

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create and configure `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start MongoDB as the `rs0` replica set. You can run only the MongoDB service from the included Compose stack:

   ```bash
   docker compose up -d mongo
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

The development server watches TypeScript source files and restarts when they change. Its port is controlled by `PORT` and defaults to `5000` when the variable is not provided. The included `.env.example` sets it to `3000`.

## Environment variables

| Variable                             | Required in production | Default                | Description                                                             |
| ------------------------------------ | ---------------------: | ---------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                           |                     No | `development`          | Runtime mode: `development`, `test`, or `production`.                   |
| `PORT`                               |                     No | `5000`                 | HTTP server port.                                                       |
| `DB_URI`                             |                     No | Local `rs0` URI        | MongoDB connection URI.                                                 |
| `DB_NAME`                            |                     No | `beseen`               | MongoDB database name.                                                  |
| `LOG_LEVEL`                          |                     No | `info`                 | Pino log level.                                                         |
| `STELLAR_NETWORK`                    |                     No | `testnet`              | Stellar network: `testnet` or `public`.                                 |
| `AUTH_DOMAIN`                        |                     No | `beseen.fi`            | Domain included in authentication messages.                             |
| `ACCESS_TOKEN_SECRET`                |                    Yes | Development-only value | Secret used to sign access tokens; must contain at least 32 characters. |
| `ACCESS_TOKEN_TTL_SECONDS`           |                     No | `900`                  | Access-token lifetime. Allowed range: 300–3,600 seconds.                |
| `REFRESH_TOKEN_TTL_SECONDS`          |                     No | `2592000`              | Refresh-session lifetime.                                               |
| `BLUX_BASE_URL`                      |                     No | `https://api.blux.cc`  | BLUX API base URL.                                                      |
| `BLUX_APP_ID`                        |                    Yes | Development-only value | BLUX application identifier.                                            |
| `BLUX_APP_SECRET`                    |                    Yes | Development-only value | BLUX server credential.                                                 |
| `BLUX_VERIFICATION_TIMEOUT_MS`       |                     No | `5000`                 | BLUX verification request timeout.                                      |
| `R2_ENDPOINT`                        |                    Yes | Placeholder URL        | Cloudflare R2 S3-compatible endpoint.                                   |
| `R2_ACCESS_KEY_ID`                   |                    Yes | Development-only value | R2 access-key identifier.                                               |
| `R2_SECRET_ACCESS_KEY`               |                    Yes | Development-only value | R2 secret access key.                                                   |
| `R2_BUCKET_NAME`                     |                     No | `beseen-avatars`       | Bucket used for profile avatars.                                        |
| `R2_PUBLIC_BASE_URL`                 |                    Yes | Development-only URL   | Public avatar base URL or custom domain.                                |
| `R2_MAX_AVATAR_BYTES`                |                     No | `5242880`              | Maximum accepted avatar size in bytes.                                  |
| `BROADCAST_DRAFT_TTL_SECONDS`        |                     No | `604800`               | Maximum lifetime of an unfinished broadcast draft.                      |
| `BROADCAST_CLEANUP_INTERVAL_SECONDS` |                     No | `300`                  | Interval for removing expired broadcast drafts.                         |

The application validates its environment during startup and exits immediately when production configuration is missing or unsafe.

## Database migrations

Database migrations run automatically after MongoDB connects and before the HTTP server starts. This includes schema backfills and index creation for existing databases, so Docker deployments do not require a separate migration command.

Migrations are idempotent and safe to run again after a restart. If a migration fails, the server does not begin accepting requests.

The manual command remains available for maintenance workflows:

```bash
npm run migrate
```

In production builds, the equivalent command is:

```bash
npm run migrate:prod
```

## API documentation

Once the server is running, the complete request and response contract is available at:

- Swagger UI: `http://127.0.0.1:3000/v1/docs/`
- OpenAPI JSON: `http://127.0.0.1:3000/v1/openapi.json`
- Health check: `http://127.0.0.1:3000/v1/health`

All application endpoints are namespaced under `/v1`.

### API areas

| Area           | Base path        | Purpose                                                                    |
| -------------- | ---------------- | -------------------------------------------------------------------------- |
| Authentication | `/v1/auth`       | Client configuration, registration, login, refresh, and logout.            |
| Users          | `/v1/users`      | Profiles, public keys, activity, discovery, and user-token operations.     |
| Broadcasts     | `/v1/broadcasts` | Encrypted broadcast drafts, recipient keys, finalization, and feed access. |
| Messenger      | `/v1/messenger`  | Conversations, encrypted messages, read state, and bounties.               |

Protected endpoints expect an access token in the standard header:

```http
Authorization: Bearer <access-token>
```

Responses use a consistent JSON envelope. A typical successful response looks like:

```json
{
  "status": "success",
  "message": "Request completed",
  "result": {}
}
```

## Security model

Private cryptographic material and plaintext message content remain on the client. The API stores only the public keys and encrypted payloads required to authenticate users, address recipients, and deliver content.

Important boundaries:

- Wallet signatures used for deterministic key derivation are created client-side.
- Derived private keys never need to be sent to the API.
- Login requests prove possession of the registered signing key.
- Login proof identifiers are persisted to prevent replay.
- Broadcast and message plaintext is encrypted before upload.
- Content keys are wrapped separately for authorized participants.
- Sensitive credentials such as BLUX and R2 secrets remain server-side.
- Avatar uploads are validated and processed before storage.
- Authentication and mutation endpoints are rate-limited.

Always use HTTPS in production and keep access-token, BLUX, database, and object-storage credentials outside the repository.

## Project structure

```text
src/
├── constant/       Domain constants and scoring configuration
├── middleware/     Authentication, rate limits, uploads, and error handling
├── migrations/     Idempotent database migrations and startup runner
├── models/         Mongoose models and indexes
├── openapi/        OpenAPI document, schemas, and endpoint definitions
├── routes/         Versioned HTTP route handlers
├── storage/        External storage clients
├── types/          Shared TypeScript types
├── utils/          Domain services and cryptographic helpers
├── validation/     Zod request-validation schemas
├── app.ts          Express application configuration
├── db.ts           MongoDB connection and transaction helpers
├── env.ts          Environment parsing and validation
└── index.ts        Application startup and graceful shutdown

tests/              Unit and route-level test suites
compose.yaml        Local API and MongoDB stack
Dockerfile          Multi-stage production image
```

## Available scripts

| Command                | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Start the development server with file watching. |
| `npm run build`        | Compile TypeScript into `dist/`.                 |
| `npm start`            | Start the compiled production server.            |
| `npm test`             | Run the complete Vitest suite once.              |
| `npm run test:watch`   | Run tests in watch mode.                         |
| `npm run lint`         | Run ESLint across the repository.                |
| `npm run format`       | Format supported files with Prettier.            |
| `npm run format:check` | Check formatting without modifying files.        |
| `npm run migrate`      | Run migrations directly from TypeScript.         |
| `npm run migrate:prod` | Run compiled migrations.                         |

## Quality checks

Before opening a pull request, run:

```bash
npm run format:check
npm run lint
npm run build
npm test
```

## Production

The provided Dockerfile creates a multi-stage production image that contains only compiled output and production dependencies. The runtime container runs as a non-root user, and the Compose service enables a read-only filesystem with a temporary `/tmp` mount.

For a production deployment:

1. Provide unique production secrets through the deployment environment.
2. Use a durable MongoDB replica set with authentication and backups.
3. Place the API behind an HTTPS reverse proxy or load balancer.
4. Restrict database and object-storage network access.
5. Configure a public R2 custom domain for avatar delivery.
6. Monitor health checks and structured application logs.
7. Preserve graceful shutdown so in-flight requests can complete.

## License

This project is licensed under the terms of the [MIT License](LICENSE).
