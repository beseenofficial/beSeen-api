# BeSeen API

Backend API for Stellar wallet accounts, minimal user profiles, and end-to-end encrypted broadcasts.

## Security boundary

- The fixed key-derivation transaction is created and signed in the client.
- Its raw wallet signature, all derived private keys, plaintext, and raw broadcast content keys never
  reach the API.
- The API stores the Stellar wallet address, the derived Ed25519/X25519 public keys, minimal profile
  data, encrypted broadcast content, and individually wrapped content keys.
- Registration validates the Stellar address through the BLUX server API with `user_id: 0` before
  creating the user. BLUX credentials remain server-only; the frontend registration contract does
  not change.
- Login has no server challenge. The client signs a timestamped UUID message with its derived
  Ed25519 private key; used UUIDs are persisted to prevent replay.

Every product user has the same capabilities. There is no `creator`/`regular` account type and no
category, bio, skill, headline, or display-name profile. Public user data is only:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "new_user",
  "avatar": "https://cdn.example/avatar.webp"
}
```

## Development

1. Copy `.env.example` to `.env`.
2. Start MongoDB as the `rs0` replica set, or run `docker compose up --build`.
3. Run `npm install`.
4. Run `npm run dev`.

The API listens on port `5000`. Docker publishes it only on `127.0.0.1:5000:5000`.

```http
GET /v1/health
GET /v1/docs/
GET /v1/openapi.json
```

## Client flow

The full browser implementation contract is in
[`docs/CLIENT_INTEGRATION_GUIDE.md`](docs/CLIENT_INTEGRATION_GUIDE.md).

The short version is:

1. `GET /v1/auth/config`.
2. Build and sign the fixed `beseen_kdf_v1` transaction locally.
3. Extract its raw 64-byte signature and use the documented HKDF settings to derive Ed25519 and
   X25519 key pairs. Keep private keys client-only.
4. For a new account, call `POST /v1/auth/register` as `multipart/form-data`: put the unchanged
   registration object in `payload` with `JSON.stringify(...)`, and put the image file in the
   optional `avatar` field. The backend verifies the wallet through BLUX, validates the actual image
   bytes, converts it to a 512x512 WebP, uploads it to R2, and stores only its public URL/object key.
5. For an existing account, sign the documented login message with the derived Ed25519 private key
   and call `POST /v1/auth/login` directly. There is no challenge request.
6. If local private keys are missing, sign the same fixed KDF transaction again and reconstruct the
   exact same key pairs before login.

The registration trust model is suitable only for the demo. Login after registration still proves
possession of the stored derived Ed25519 private key.

The browser should reject avatar files over 5 MiB, images below 128x128 pixels, and non-JPEG/PNG/WebP
selections for immediate feedback. Backend validation remains authoritative. `R2_PUBLIC_BASE_URL` must be an R2 custom domain
or enabled public development URL; the S3 API endpoint is not a browser image URL.

Avatar is optional. `PATCH /v1/users/me` accepts a new optional `avatar` file using the same
multipart `payload` convention. The payload may contain `username` or `removeAvatar: true`; a
username-only update may remain JSON. The API replaces or removes the old R2 object only after the
profile update succeeds.

## Broadcasts

Every active user owns one database-backed demo token. Another authenticated user can acquire it
without payment or an on-chain transaction. A broadcast audience is the active holders of the
sender's token at the moment the draft is created:

- `Broadcast.audienceType = "token_holders"`
- `BroadcastRecipient.accessMode = "token"`
- `BroadcastRecipient.tokenId` identifies the sender's token

The purchase endpoint is idempotent, so repeated clicks cannot create duplicate ownership records.
Payment and Stellar asset validation can replace this demo acquisition later without changing the
encryption flow.

The same existing token purchase also ensures one canonical Messenger conversation for the buyer
and token owner. It does not create a separate Messenger token or entitlement. Repeating the
purchase, or later purchasing in the reverse direction, reuses the same user-pair conversation.

Broadcast encryption is entirely client-side:

1. Create a draft and receive the frozen recipient X25519 public-key snapshot plus the sender's own
   public key.
2. Generate one random 32-byte content key.
3. Encrypt plaintext once with XChaCha20-Poly1305.
4. Wrap that content key separately for every recipient and once for the sender with X25519 sealed
   boxes.
5. Upload only wrapped keys, ciphertext, nonce, and the derived Ed25519 manifest signature.
6. Recipients and the sender unwrap their own copy locally and decrypt locally.

The public key does not need to be resent as proof on every call. A public key proves nothing by
itself; the Ed25519 signature proves possession of its matching private key. JWT authentication
protects draft operations, and finalization additionally verifies the signed encrypted manifest.

## Verification

```powershell
npm run build
npm run lint
npm test
```
