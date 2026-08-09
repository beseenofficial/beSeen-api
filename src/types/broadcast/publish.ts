import type { BroadcastAudienceType } from '../../constant/broadcast';

interface PublishedBroadcast {
  id: string;
  clientBroadcastId: string;
  creatorId: string;
  status: 'published';
  audience: { type: BroadcastAudienceType; count: number };
  encryptionVersion: number;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: Date;
}

interface BroadcastSignatureMessageInput {
  broadcastId: string;
  clientBroadcastId: string;
  creatorId: string;
  creatorKeyVersion: number;
  encryptionVersion: number;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  audienceType: string;
  audienceCount: number;
  recipientKeysDigest: string;
}

interface BroadcastRecipientKeyDigestEntry {
  recipientId: string;
  keyVersion: number;
  encryptionPublicKey: string;
  encryptedBroadcastKey: string;
}

type FinalizeBroadcastFailure =
  | { reason: 'draft_not_found' }
  | { reason: 'draft_expired' }
  | { reason: 'recipient_keys_incomplete'; remainingCount: number }
  | { reason: 'audience_snapshot_mismatch' }
  | { reason: 'invalid_signature' }
  | { reason: 'finalization_conflict' };

type FinalizeBroadcastResult =
  | { ok: true; broadcast: PublishedBroadcast; publishedNow: boolean }
  | ({ ok: false } & FinalizeBroadcastFailure);

export type {
  BroadcastRecipientKeyDigestEntry,
  BroadcastSignatureMessageInput,
  FinalizeBroadcastFailure,
  FinalizeBroadcastResult,
  PublishedBroadcast,
};
