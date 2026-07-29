import { CreateBroadcastDraftFailureReason } from "../../utils/broadcast/createBroadcastDraft";
import { UploadBroadcastRecipientKeysFailureReason } from "../../utils/broadcast/uploadBroadcastRecipientKeys";

export const draftErrors: Record<
  CreateBroadcastDraftFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  user_unavailable: {
    statusCode: 401,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The user account is not available',
  },
  active_keys_not_found: {
    statusCode: 409,
    code: 'ACTIVE_KEYS_NOT_FOUND',
    message: 'The user does not have active encryption keys',
  },
};

export const finalizeErrors = {
  draft_not_found: {
    statusCode: 404,
    code: 'BROADCAST_DRAFT_NOT_FOUND',
    message: 'Broadcast draft was not found',
  },
  draft_expired: {
    statusCode: 410,
    code: 'BROADCAST_DRAFT_EXPIRED',
    message: 'Broadcast draft has expired',
  },
  audience_snapshot_mismatch: {
    statusCode: 409,
    code: 'AUDIENCE_SNAPSHOT_MISMATCH',
    message: 'The frozen broadcast audience is inconsistent',
  },
  invalid_signature: {
    statusCode: 401,
    code: 'INVALID_BROADCAST_SIGNATURE',
    message: 'The encrypted broadcast signature is invalid',
  },
  finalization_conflict: {
    statusCode: 409,
    code: 'BROADCAST_FINALIZATION_CONFLICT',
    message: 'This broadcast was already finalized with different encrypted content',
  },
} as const;

export const uploadErrors: Record<
  UploadBroadcastRecipientKeysFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  draft_not_found: {
    statusCode: 404,
    code: 'BROADCAST_DRAFT_NOT_FOUND',
    message: 'Broadcast draft was not found',
  },
  recipient_not_in_audience: {
    statusCode: 409,
    code: 'RECIPIENT_NOT_IN_AUDIENCE',
    message: 'A recipient does not belong to the frozen audience',
  },
  encrypted_key_conflict: {
    statusCode: 409,
    code: 'ENCRYPTED_KEY_CONFLICT',
    message: 'A different encrypted key was already stored for a recipient',
  },
};