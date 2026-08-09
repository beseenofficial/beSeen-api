import type { BroadcastAudienceType } from '../../constant/broadcast';

interface BroadcastRecipientPublicKey {
  userId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  keyUploaded: boolean;
  encryptedBroadcastKey: string | null;
}

interface BroadcastRecipientPage {
  items: BroadcastRecipientPublicKey[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CreatedBroadcastDraft {
  id: string;
  clientBroadcastId: string;
  status: 'draft';
  audience: { type: 'token_holders'; count: number };
  encryption: { version: number; contentSuite: string; keyWrapSuite: string };
  creatorKey: { keyVersion: number; encryptionPublicKey: string };
  progress: { uploadedCount: number; remainingCount: number; complete: boolean };
  recipients: BroadcastRecipientPage;
  createdAt: Date;
  expiresAt: Date;
}

interface BroadcastDraftListItem {
  id: string;
  clientBroadcastId: string;
  status: 'draft';
  audience: { type: BroadcastAudienceType; count: number };
  progress: { uploadedCount: number; remainingCount: number; complete: boolean };
  encryption: { version: number; contentSuite: string; keyWrapSuite: string };
  creatorKey: { keyVersion: number; encryptionPublicKey: string };
  createdAt: Date;
  expiresAt: Date;
}

interface BroadcastDraftListPage {
  items: BroadcastDraftListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface BroadcastKeyUploadProgress {
  acceptedCount: number;
  uploadedCount: number;
  audienceCount: number;
  remainingCount: number;
  complete: boolean;
}

interface BroadcastAudienceMember {
  recipientId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
  accessMode: 'token';
  tokenId: string;
}

interface BroadcastDraftCleanupResult {
  expiredDraftCount: number;
  deletedDraftCount: number;
  deletedRecipientCount: number;
}

type CreateBroadcastDraftFailureReason = 'user_unavailable' | 'active_keys_not_found';

type CreateBroadcastDraftResult =
  | { ok: true; draft: CreatedBroadcastDraft; created: boolean }
  | { ok: false; reason: CreateBroadcastDraftFailureReason };

type GetBroadcastDraftRecipientsResult =
  | {
      ok: true;
      draft: {
        id: string;
        clientBroadcastId: string;
        status: 'draft';
        audienceType: BroadcastAudienceType;
        audienceCount: number;
        progress: { uploadedCount: number; remainingCount: number; complete: boolean };
        expiresAt: Date;
      };
      recipients: BroadcastRecipientPage;
    }
  | { ok: false; reason: 'draft_not_found' };

type GetBroadcastDraftsResult =
  { ok: true; drafts: BroadcastDraftListPage } | { ok: false; reason: 'account_unavailable' };

type UploadBroadcastRecipientKeysFailureReason =
  'draft_not_found' | 'recipient_not_in_audience' | 'encrypted_key_conflict';

type UploadBroadcastRecipientKeysResult =
  | { ok: true; progress: BroadcastKeyUploadProgress }
  | { ok: false; reason: UploadBroadcastRecipientKeysFailureReason };

type CancelBroadcastDraftResult =
  | {
      ok: true;
      canceledNow: boolean;
      canceledAt: Date;
      removedRecipientCount: number;
    }
  | { ok: false; reason: 'draft_not_found' | 'published_broadcast' };

export type {
  BroadcastAudienceMember,
  BroadcastDraftCleanupResult,
  BroadcastDraftListItem,
  BroadcastDraftListPage,
  BroadcastKeyUploadProgress,
  BroadcastRecipientPage,
  BroadcastRecipientPublicKey,
  CancelBroadcastDraftResult,
  CreatedBroadcastDraft,
  CreateBroadcastDraftFailureReason,
  CreateBroadcastDraftResult,
  GetBroadcastDraftRecipientsResult,
  GetBroadcastDraftsResult,
  UploadBroadcastRecipientKeysFailureReason,
  UploadBroadcastRecipientKeysResult,
};
