# BeSeen API

Backend API for BeSeen, built with Express, TypeScript, MongoDB, and Mongoose.

## Development

1. Copy `.env.example` to `.env`.
2. Start MongoDB.
3. Run `npm install`.
4. Run `npm run dev`.

The first available endpoint is:

```http
GET /v1/health
```

Interactive API documentation and the machine-readable contract are available at:

```http
GET /v1/docs/
GET /v1/openapi.json
```

Swagger UI supports Bearer authorization and can execute requests against the current API origin.
The OpenAPI 3.1 document is validated by the automated test suite.

## Client-first registration

Registration uses SEP-10 transaction signing and only two API requests. The transaction is signed
locally as proof of wallet ownership; it is never submitted to Stellar and therefore pays no fee.

The public authentication and local key-generation settings are available without a wallet
parameter:

```http
GET /v1/auth/config
```

The client generates a cryptographically random 32-byte master secret and derives its BeSeen
Ed25519/X25519 key pairs locally using the returned HKDF settings. It stores or restores that master
secret through the application's encrypted device-key backup. Wallet signatures are never used as
encryption-key material.

1. Send the wallet address and the two derived public keys:

```http
POST /v1/auth/registration/challenge
```

2. Sign the returned `transactionXdr` with Blux `signTransaction`, using the returned
   `networkPassphrase`. Send the signed XDR with the profile:

```http
POST /v1/auth/register
Content-Type: application/json

{
  "challengeId": "507f1f77bcf86cd799439099",
  "signedTransactionXdr": "<base64 signed Stellar transaction envelope XDR>",
  "profile": {
    "username": "new_user",
    "displayName": "New User",
    "accountType": "regular"
  }
}
```

The successful response contains both `user` and `auth`, so the client is logged in immediately and
does not need another wallet signature or login request. Send `auth.accessToken` as
`Authorization: Bearer <accessToken>` on authenticated requests.

## Wallet login

Existing users also log in with only two API requests and no password:

```http
POST /v1/auth/login/challenge
Content-Type: application/json

{
  "walletAddress": "<Stellar G address>"
}
```

Sign the returned `transactionXdr` through Blux `signTransaction`. Do not call any submit or send
method. Then send:

```http
POST /v1/auth/login
Content-Type: application/json

{
  "challengeId": "507f1f77bcf86cd799439099",
  "signedTransactionXdr": "<base64 signed Stellar transaction envelope XDR>"
}
```

Login returns the same `result.user` and `result.auth` shape as registration. This lets the client
use one success handler for both flows. Challenges are short-lived and one-time-use, and failed
verification attempts are limited.

## Authenticated requests

Send the current access token on protected requests:

```http
Authorization: Bearer <accessToken>
```

Retrieve the latest profile for the signed-in user with:

```http
GET /v1/users/me
Authorization: Bearer <accessToken>
```

Log out and immediately revoke the current session with:

```http
POST /v1/auth/logout
Authorization: Bearer <accessToken>
```

After a successful logout, the client should remove both access and refresh tokens. The revoked
access token is rejected immediately; it remains unusable even if its JWT expiration time has not
been reached.

For a simple client interceptor: send the access token, call `/v1/auth/refresh` once after a `401`,
store both newly returned tokens, then retry the original request once. If refresh also returns
`401`, clear the local session and return the user to wallet login.

## Profile APIs

Username availability can be checked while the user types:

```http
GET /v1/users/username/availability?username=new_user
```

The endpoint always returns a form-friendly `available` boolean and a normalized `username`.
Unavailable values include a `reason` of `invalid`, `reserved`, or `taken`; an available value has
`reason: null`. Clients should debounce this request, and still handle `USERNAME_TAKEN` from register
or profile update because availability can change concurrently.

Update only changed fields; the client does not need to send the full profile:

```http
PATCH /v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "displayName": "New Name",
  "bio": "Updated bio",
  "avatarUrl": "https://cdn.example/avatar.webp"
}
```

Promoting a regular account requires the creator fields once:

```json
{
  "accountType": "creator",
  "creatorProfile": {
    "headline": "Visual storyteller",
    "categories": ["Photography"],
    "skills": ["Editing"],
    "websiteUrl": "https://creator.example",
    "isAvailableForWork": true
  }
}
```

An existing creator may update only one creator field, even if the client also sends the unchanged
`accountType`. Switching back only requires `{ "accountType": "regular" }`; creator-only data is
removed atomically.

Public profiles require no access token:

```http
GET /v1/users/:username
```

Public responses intentionally exclude the Stellar wallet address. The wallet is currently returned
only to its owner through registration, login, and `/v1/users/me`.

## End-to-end encrypted broadcasts

The broadcast flow is multi-recipient. The API never accepts broadcast plaintext, a private key, the
random content-encryption key, decrypted content, or the client-generated master secret.

Version 1 uses hybrid encryption in the browser:

- Generate one random 32-byte content-encryption key.
- Encrypt the message once with `XCHACHA20-POLY1305-IETF`.
- Wrap that random key separately for each recipient using the recipient's X25519 public key and
  `X25519-XSALSA20-POLY1305-SEALEDBOX`.
- Wrap the same key for the creator too, so the creator can later decrypt their own broadcast.

The server stores only encrypted message data and the individually wrapped keys. It never encrypts
or decrypts the content itself.

### 1. Create an audience snapshot

Only creator accounts can start a broadcast. Generate a UUID once and safely reuse it when retrying:

```http
POST /v1/broadcasts/drafts
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "clientBroadcastId": "2f2b1762-f0f5-4b1b-8acd-70afcf043365"
}
```

For now, the audience resolver includes every other active user with an active encryption public key.
The token-holder model is not built yet. Later, only this resolver changes to token holders; the
client encryption flow stays the same.

The response contains the frozen audience count, the creator's own encryption public key, and the
first 100 recipient public keys. For small audiences, the client receives everything in this single
request. The server chooses the audience, so a modified client cannot silently omit an eligible
member before publication.

### 2. Get the remaining key pages

When `recipients.hasMore` is true, pass `recipients.nextCursor` to:

```http
GET /v1/broadcasts/drafts/:draftId/recipients?cursor=<nextCursor>&limit=100
Authorization: Bearer <accessToken>
```

The maximum page size is 250. Each item contains only `userId`, `username`, `keyVersion`, and the
X25519 `encryptionPublicKey` captured when the draft was created. This frozen key version prevents a
mid-send key rotation from silently changing the audience contract.

### 3. Upload wrapped content keys

Generate one random 32-byte content key in the browser. For every snapshot item, wrap that same key
with the item's X25519 public key using libsodium sealed boxes. A wrapped 32-byte key is exactly 80
bytes and must be sent as canonical base64:

```http
PUT /v1/broadcasts/drafts/:draftId/recipient-keys
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "keys": [
    {
      "recipientId": "507f1f77bcf86cd799439011",
      "keyVersion": 1,
      "encryptedBroadcastKey": "<base64 80-byte sealed-box ciphertext>"
    }
  ]
}
```

A batch can contain 1 to 250 unique recipients. The server verifies that every recipient and key
version belongs to the frozen snapshot. Retrying the exact same batch is safe. Store and resend the
same generated ciphertext when retrying; a different ciphertext for an already uploaded recipient is
rejected with `ENCRYPTED_KEY_CONFLICT`.

The response contains `acceptedCount`, `uploadedCount`, `audienceCount`, `remainingCount`, and
`complete`. Continue uploading pages until `complete` is true. The raw content key must never be sent
in this request.

### Resume an interrupted draft

List unfinished drafts after a refresh, browser restart, or network interruption:

```http
GET /v1/broadcasts/drafts?limit=20
Authorization: Bearer <accessToken>
```

Every item includes its `clientBroadcastId`, creator public encryption key, frozen audience count, and
current upload `progress`. Use `nextCursor` when `hasMore` is true.

Then reload the frozen audience pages:

```http
GET /v1/broadcasts/drafts/:draftId/recipients?limit=100
Authorization: Bearer <accessToken>
```

Each recipient now includes `keyUploaded` and `encryptedBroadcastKey`. A null value still needs to be
wrapped and uploaded. A non-null value is the exact ciphertext already stored by the server; reuse it
when rebuilding the sorted recipient manifest instead of generating a new sealed-box ciphertext.
Only the authenticated draft owner can retrieve these values. They are encrypted content-key copies,
not raw content keys, and the server cannot open them.

### Cancel and expire unfinished drafts

Cancel an unfinished draft when the user abandons the composer:

```http
DELETE /v1/broadcasts/drafts/:draftId
Authorization: Bearer <accessToken>
```

Cancellation first changes the database status from `draft` to `canceled` atomically, then removes the
recipient snapshot. A concurrent finalize and cancel cannot both win. Published broadcasts are never
removed by this endpoint.

Draft responses include `expiresAt`. By default an unfinished draft expires after seven days. The API
marks expired drafts canceled and safely removes their recipient ciphertext rows in background
batches. Published broadcasts are excluded from cleanup regardless of their original draft expiry.

The retention and cleanup schedule are configurable:

```dotenv
BROADCAST_DRAFT_TTL_SECONDS=604800
BROADCAST_CLEANUP_INTERVAL_SECONDS=300
```

### 4. Sign and finalize

Encrypt the plaintext once in the browser using XChaCha20-Poly1305, the random 32-byte content key,
and a random 24-byte nonce. Also wrap the content key for the creator's X25519 public key returned by
the draft endpoint.

Before signing, build the recipient digest. Sort every uploaded recipient by lowercase `recipientId`,
represent each item as this four-value array, then SHA-256 hash the UTF-8 JSON string and encode the
digest as lowercase hex:

```text
[
  recipientId,
  keyVersion,
  encryptionPublicKey,
  encryptedBroadcastKey
]
```

The complete value being hashed is a JSON array containing all of those arrays, with no pretty
printing. This is equivalent to JavaScript `JSON.stringify(sortedEntries)`.

Build the exact UTF-8 signature message with `\n` line separators and no trailing newline:

```text
BeSeen Encrypted Broadcast
Signature Version: 1
Encryption Version: 1
Content Suite: XCHACHA20-POLY1305-IETF
Key Wrap Suite: X25519-XSALSA20-POLY1305-SEALEDBOX
Broadcast ID: <lowercase draft id>
Client Broadcast ID: <lowercase UUID>
Creator ID: <lowercase creator user id>
Creator Key Version: <creator key version>
Content Nonce: <base64 24-byte nonce>
Content Ciphertext: <base64 ciphertext>
Creator Encrypted Broadcast Key: <base64 80-byte sealed-box ciphertext>
Audience Type: all_active_users
Audience Count: <frozen audience count>
Recipient Keys Digest: <lowercase SHA-256 hex>
```

Sign this message locally using the creator's derived Ed25519 private signing key, then send:

```http
POST /v1/broadcasts/drafts/:draftId/finalize
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "contentCiphertext": "<base64 XChaCha20-Poly1305 ciphertext>",
  "contentNonce": "<base64 24-byte nonce>",
  "creatorEncryptedBroadcastKey": "<base64 80-byte sealed-box ciphertext>",
  "signature": "<base64 64-byte Ed25519 signature>"
}
```

The server independently reconstructs the digest and signature message. Publication succeeds only
when all recipient wrapped keys exist and the signature is valid. Retrying the identical finalize
request is safe. The server stores and returns only encrypted content and encrypted content keys.

### 5. Read and decrypt broadcasts

The same paginated endpoint serves received broadcasts and the creator's own sent copies:

```http
GET /v1/broadcasts/feed?view=received&limit=20
GET /v1/broadcasts/feed?view=sent&limit=20
Authorization: Bearer <accessToken>
```

`view` defaults to `received`. When `hasMore` is true, pass `nextCursor` in the next request. The
maximum page size is 50.

Both views return the same item shape:

- `manifest` contains the signed encrypted content and all values needed to reconstruct the canonical
  signature message. Its creator wrapped key is ciphertext required for integrity verification and
  cannot be opened by recipients.
- `integrity` contains the creator's frozen Ed25519 signing public key and signature.
- `viewerKey` contains only the wrapped content key for the authenticated viewer. Its `source` is
  `recipient` for received messages and `creator` for sent messages.
- `creator` contains public profile identity only and never includes the Stellar wallet address.

For every item, the client should:

1. Rebuild the documented signature message from `id`, `clientBroadcastId`, and `manifest`, then
   verify `integrity.signature` with `integrity.signingPublicKey`.
2. Open `viewerKey.encryptedBroadcastKey` locally using the X25519 private key matching
   `viewerKey.keyVersion`.
3. Use the recovered 32-byte content key with `manifest.contentNonce` to decrypt
   `manifest.contentCiphertext` using XChaCha20-Poly1305.

Signature verification and both decryption steps happen entirely in the browser. The feed API never
receives or returns plaintext, a raw content key, or a private key.

`GET /v1/users/:username/keys` remains available for direct public-key discovery, but broadcast
clients should use the server-created draft snapshot instead of assembling their own recipient list.

Access tokens are short-lived. Refresh them with:

```http
POST /v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<current refresh token>"
}
```

Refresh tokens rotate on every successful call. The client must replace the stored refresh token
with the new value returned by this endpoint.

## User profiles

Every account has a common `User` profile. Creator-only fields are stored in a one-to-one
`CreatorProfile`, keeping regular user documents small and avoiding unrelated optional fields.

Wallet ownership challenges are stored temporarily in `AuthChallenge`. BeSeen Ed25519 signing and
X25519 encryption public keys are versioned separately in `UserKey`; private keys and the
client-generated master secret never reach the API.

## Commands

- `npm run dev` - run the API in watch mode
- `npm run build` - compile TypeScript
- `npm run start` - run the compiled API
- `npm run lint` - lint the codebase
- `npm test` - run the test suite
