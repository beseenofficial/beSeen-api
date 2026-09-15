# BeSeen

BeSeen is a privacy-focused social protocol built around wallet-owned identity, encrypted communication, and Aura-based audience access.

Instead of asking users to create and manage a separate cryptographic identity, BeSeen derives an application-specific signing key and encryption key from a fixed Stellar wallet signature. Private keys and plaintext remain on the client. The API coordinates identity, delivery, audience membership, replay protection, discovery, and encrypted state without needing access to message content.

This repository contains the BeSeen API: the protocol coordination and persistence layer for authentication, profiles, discovery, broadcasts, direct messages, on-chain Aura ownership, and message bounties.

## The problem

Wallet-based applications commonly prove account ownership but then fall back to conventional server-controlled identity and plaintext communication. Private social applications have the opposite problem: they can encrypt content, but key creation, recovery, discovery, and audience management often create too much friction for mainstream users.

BeSeen connects these two layers:

- A Stellar wallet is the root of the user's application identity.
- Deterministic key derivation makes the same communication identity recoverable from the same wallet.
- Separate signing and encryption keys prevent one key from being reused for unrelated cryptographic purposes.
- Content is encrypted before it reaches the API.
- Confirmed on-chain Aura ownership defines who can follow, message, and access a creator's broadcasts.
- The server verifies authorization and integrity without receiving private keys or plaintext.

## Core protocol

### 1. Wallet-derived identity

The client constructs a fixed, non-submitted Stellar transaction containing the `beseen_kdf_v1` domain marker and asks the connected wallet to sign it.

The resulting raw 64-byte transaction signature is used locally as input to `HKDF-SHA-256`. Domain-separated derivation contexts produce two independent 32-byte seeds:

```text
Stellar wallet
      │
      │ signs a fixed transaction locally
      ▼
64-byte wallet signature
      │
      ├── HKDF: beseen.fi/ed25519-signing-key/v1
      │         └── Ed25519 signing key pair
      │
      └── HKDF: beseen.fi/x25519-encryption-key/v1
                └── X25519 encryption key pair
```

The fixed transaction has no ledger effect and is never submitted to Stellar. Its raw signature, derived seeds, and private keys are not sent to the API. Only the wallet address and derived public keys are registered.

This design gives the client two distinct capabilities:

- **Ed25519 signing:** proves authorship and protects the integrity of login proofs, messages, and broadcasts.
- **X25519 encryption:** wraps per-content symmetric keys for authorized readers.

Because derivation is versioned and domain-separated, the protocol can evolve without silently reusing key material across purposes or versions.

### 2. Signed authentication without passwords

Login uses the derived Ed25519 key rather than a password or raw wallet signature. The client signs a canonical proof containing:

- protocol version;
- wallet address;
- a client-generated UUID request ID; and
- an issuance timestamp.

The API verifies the signature against the active public signing key, enforces a five-minute validity window, and persists the request ID. Reusing the same proof is rejected at the database level, providing replay resistance even when multiple API instances process requests concurrently.

Successful authentication creates a short-lived access token and a rotating refresh session. Refresh-token material is hashed before persistence, session rotation is transactional, and logout revokes the active session.

### 3. Hybrid end-to-end encryption

Direct messages and broadcasts use a hybrid encryption envelope:

1. The client generates a random 32-byte content key.
2. Plaintext is encrypted once with `XChaCha20-Poly1305-IETF` using a 24-byte nonce.
3. The content key is wrapped separately for each authorized reader with an `X25519-XSalsa20-Poly1305` sealed box.
4. The sender signs a canonical manifest that binds the encrypted payload, nonce, participant identities, public-key versions, wrapped keys, protocol versions, and relevant metadata.
5. The API verifies the Ed25519 signature and stores only the encrypted envelope.

```text
Plaintext
   │
   ├── random content key + XChaCha20-Poly1305
   │                     └── ciphertext + nonce
   │
   └── content key
          ├── sealed to recipient X25519 key
          └── sealed to sender X25519 key

Canonical envelope ── Ed25519 signature ──► API verification and storage
```

The sender receives a wrapped copy so sent content remains readable from the sender's own client. The API cannot unwrap these keys because it never holds participant private keys.

Canonical Base64 encoding, exact byte-length validation, immutable encrypted fields, protocol versioning, and signed metadata reduce ambiguity between clients and prevent an encrypted payload from being reinterpreted with altered context.

## Encrypted direct messaging

Every authorized pair of users shares one canonical conversation. A confirmed `buy_aura` purchase establishes or reuses that conversation; an unverified client claim never opens access.

For every message, the signed manifest binds:

- conversation, sender, and recipient IDs;
- a client-generated message UUID;
- sender and recipient key versions;
- both public encryption keys and the sender signing key;
- ciphertext and nonce;
- wrapped content-key copies for sender and recipient;
- reply target; and
- optional bounty terms.

Message delivery is idempotent. Repeating the same request can safely return the existing message, while attempting to reuse a client message ID with different content is rejected. Per-conversation monotonic sequence numbers provide stable history pagination and read cursors.

Read receipts do not require plaintext access. Each participant advances a monotonic sequence cursor after displaying messages, allowing unread counts and recipient-seen state to be calculated from encrypted history.

## Encrypted broadcasts

Broadcasts extend the same hybrid encryption model from one recipient to an Aura-defined audience.

When a draft is created, the API freezes an audience snapshot from users with a confirmed Aura follow for the creator and returns their X25519 public keys. The client encrypts the content only once, wraps the content key once per recipient, and also creates a sender copy.

Recipient key entries are sorted canonically and reduced to a SHA-256 digest. The creator signs a manifest containing this digest together with the ciphertext, nonce, audience count, creator key version, and encrypted sender key. The API verifies the complete manifest before atomically publishing the broadcast.

This produces two useful properties:

- Encryption cost for the content itself stays constant as the audience grows; only small wrapped-key records scale with recipient count.
- Audience access is fixed at publication time, so later Aura ownership changes cannot rewrite the authorized readers of an existing broadcast.

Draft creation, paginated recipient retrieval, batched wrapped-key upload, finalization, cancellation, expiration, and feed delivery are separate operations. This makes large audience preparation resumable without publishing a partially prepared envelope.

## Aura-based social graph

The client buys an Aura by calling `buy_aura(buyer, subject)` and signing the transaction in the user's wallet. It then registers the returned global token ID, buyer address, subject address, and transaction hash through `POST /v1/users/:username/aura/purchases`.

- The API first stores the claim as pending.
- A matching `buy_aura` event confirms it; `get_aura` reconciliation recovers missed or event-before-API cases.
- Only matching authenticated buyer, subject, token ID, and on-chain ownership create the unique Aura follow and conversation.
- Multiple Auras for the same subject still create one follow relationship.

Unregistered direct contract purchases are ignored by the social index. The removed `UserToken` and `TokenHolding` demo collections are not used as an authorization source.

## Message bounties

An encrypted direct message can include signed bounty terms: asset code, canonical decimal amount, and response window. These terms are part of the immutable message manifest, so they cannot be detached from or changed independently of the message that created them.

The bounty lifecycle is transactional:

```text
offered ── valid direct reply ──► claimable ── beneficiary claim ──► claimed
   │
   └── response window elapsed ──► expired
```

The first valid reply to the referenced message queues its contract bounty for settlement. A leased retry worker verifies the on-chain sender, recipient, amount, status, and deadline, then signs `settle_replies` with the configured verifier. The bounty becomes `claimed` only after the transaction succeeds (or the worker confirms that it was already settled), so retries are idempotent and a failed submission cannot move database state ahead of the contract. The legacy demo-balance claim path cannot finalize contract-funded bounties.

The API mirrors BeSeen contract bounties in a dedicated collection without replacing MongoDB `_id` values. Successful `lock_bnty` events are the primary ingestion path and `contractBountyId` stores the contract-generated global ID. Only IDs registered by the official message API are mirrored; unrelated direct interactions with the public contract are ignored. A persisted event cursor makes event replay idempotent. Every minute, reconciliation calls `get_bounty` for the next global contract ID and separately recovers registered-but-unmirrored IDs whose event arrived before their API registration or was missed.

## Discovery ranking

Discovery is designed as a bounded multi-signal ranking system rather than a raw follower leaderboard. Scores are recalculated in batches and persisted for efficient cursor-based retrieval.

The current 100-point model combines:

| Signal                             | Maximum contribution |
| ---------------------------------- | -------------------: |
| Total followers                    |                   25 |
| Recent follower growth and recency |                   17 |
| Claimed message bounties           |                   15 |
| Reciprocal conversation activity   |                   15 |
| Published broadcasts               |                   11 |
| Credited online activity           |                   10 |
| Account maturity                   |                    5 |
| Profile avatar                     |                    2 |

Signals use caps, recency decay, and fixed maximum contributions so a single dimension cannot dominate indefinitely. New accounts receive a temporary, declining visibility boost.

Online activity is credited through authenticated heartbeats only when intervals are plausible. The ranking uses the most recent 30 days, combining total active duration, active-day consistency, and recent presence. Excessively frequent heartbeats do not create additional time, and long gaps are not treated as continuous activity.

## What the server can and cannot see

| The API receives                          | The API does not receive               |
| ----------------------------------------- | -------------------------------------- |
| Stellar public wallet address             | Stellar private key                    |
| Derived Ed25519 and X25519 public keys    | Fixed-transaction raw wallet signature |
| Ciphertext and nonces                     | Derived private keys or seeds          |
| Individually wrapped content keys         | Unwrapped content keys                 |
| Signed canonical manifests                | Message or broadcast plaintext         |
| Audience membership and delivery metadata | Locally decrypted content              |

The API necessarily observes service metadata such as accounts, relationships, conversation participants, broadcast audience membership, timestamps, and encrypted payload sizes. The current protocol protects content confidentiality; it does not claim metadata anonymity.

## Integrity and consistency

MongoDB replica-set transactions are used wherever several records must change as one operation, including registration, session creation and rotation, message sequencing, bounty transitions, Aura confirmation, follow activation, and conversation creation.

Additional consistency controls include:

- unique indexes for replay IDs and client-generated operation IDs;
- one active key record per user;
- one canonical conversation per user pair;
- one confirmed Aura follow per buyer and subject pair;
- immutable encrypted message fields;
- frozen broadcast audience snapshots;
- strict schemas and canonical encoding validation;
- cursor-based pagination for mutable feeds and histories;
- rate limits on authentication, mutation, and high-volume endpoints;
- startup migrations that backfill existing databases and ensure required indexes before traffic is accepted.

## System architecture

```text
┌──────────────────────────── Client ────────────────────────────┐
│ Stellar wallet                                                  │
│ Local key derivation                                            │
│ Local encryption, decryption, signing, and signature checks     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ public keys, proofs,
                                │ ciphertext, wrapped keys
                                ▼
┌──────────────────────────── BeSeen API ─────────────────────────┐
│ Authentication and replay protection                            │
│ Protocol validation and signature verification                  │
│ Audience, conversation, token, bounty, and discovery services   │
│ OpenAPI contract, rate limiting, and structured logs             │
└──────────────────────┬─────────────────────┬────────────────────┘
                       │                     │
                       ▼                     ▼
              MongoDB replica set       Cloudflare R2
              protocol state and        processed avatars
              encrypted envelopes
```

## API surface

The API is versioned under `/v1` and grouped into four domains:

- `/v1/auth` — client protocol configuration, registration, signed login, refresh, and logout
- `/v1/users` — profiles, public keys, discovery, activity, Aura purchase registration, and follower data
- `/v1/broadcasts` — encrypted drafts, audience snapshots, wrapped-key batches, publication, and feed
- `/v1/messenger` — conversations, encrypted history, messages, read state, and bounty claims

When the service is running, the complete request and response schemas are available through:

- Swagger UI: `http://127.0.0.1:3000/v1/docs/`
- OpenAPI JSON: `http://127.0.0.1:3000/v1/openapi.json`
- Health check: `http://127.0.0.1:3000/v1/health`

## Current scope and protocol evolution

The repository implements the complete server-side flow described above, including cryptographic envelope validation, transactional persistence, replay prevention, activity-aware discovery, and automated schema upgrades.

Two boundaries are intentionally explicit in the current prototype:

1. Registration verifies the Stellar address through BLUX and validates the format of submitted derived public keys, but it does not yet require an additional wallet ownership challenge that cryptographically binds those keys during registration.
2. Aura buying and contract bounty locking remain client-owned. The API confirms registered Aura purchases, mirrors registered bounty locks, and submits verifier-authorized reply settlements; it never signs either user purchase or `lock_bounty` transactions.

The protocol is versioned so these components can be replaced with stronger production mechanisms without changing the encrypted content model. A production registration ceremony can bind the wallet, derived public keys, network, domain, and one-time server challenge in a single signed transcript. Likewise, the current token and bounty state machines can be connected to verified Stellar transactions or escrow contracts.

## Running the prototype

The fastest way to run the API and its required single-node MongoDB replica set is Docker Compose.

```powershell
Copy-Item .env.example .env
```

Set the BLUX, Cloudflare R2, access-token, and BeSeen contract credentials in `.env`. Contract synchronization requires `STELLAR_RPC_URL`, `BESEEN_CONTRACT_ID`, `BESEEN_RPC_SOURCE_ACCOUNT`, and the contract deployment ledger in `BESEEN_CONTRACT_START_LEDGER`. Reply settlement additionally requires `BESEEN_VERIFIER_SECRET`; its public key must equal `BESEEN_RPC_SOURCE_ACCOUNT`. Keep this secret server-side and never send it to a client.

Then run:

```bash
docker compose up --build
```

The API becomes available at `http://127.0.0.1:3000`. Database migrations run automatically before the server accepts traffic; no separate migration step is required.

For local TypeScript development:

```bash
npm install
docker compose up -d mongo
npm run dev
```

## Verification

The repository includes unit and route-level coverage for authentication, cryptographic manifests, replay handling, broadcasts, messaging, bounties, Aura confirmation, discovery ranking, migrations, avatars, and user activity.

```bash
npm run format:check
npm run lint
npm run build
npm test
```

## License

Licensed under the [MIT License](LICENSE).
