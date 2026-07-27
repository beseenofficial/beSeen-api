import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { UploadBroadcastRecipientKeysBody } from '../../validation/broadcast/uploadRecipientKeys';

type UploadBroadcastRecipientKeysFailureReason =
  | 'draft_not_found'
  | 'recipient_not_in_audience'
  | 'key_version_mismatch'
  | 'encrypted_key_conflict';

interface BroadcastKeyUploadProgress {
  acceptedCount: number;
  uploadedCount: number;
  audienceCount: number;
  remainingCount: number;
  complete: boolean;
}

type UploadBroadcastRecipientKeysResult =
  | { ok: true; progress: BroadcastKeyUploadProgress }
  | { ok: false; reason: UploadBroadcastRecipientKeysFailureReason };

const uploadBroadcastRecipientKeys = async (
  creatorId: string,
  draftId: string,
  body: UploadBroadcastRecipientKeysBody,
): Promise<UploadBroadcastRecipientKeysResult> => {
  const draft = await Broadcast.findOne({
    _id: draftId,
    creator: creatorId,
    status: 'draft',
    expiresAt: { $gt: new Date() },
  }).exec();

  if (!draft) {
    return { ok: false, reason: 'draft_not_found' };
  }

  const rows = await BroadcastRecipient.find({
    broadcast: draft._id,
    recipient: { $in: body.keys.map((key) => key.recipientId) },
  }).exec();

  if (rows.length !== body.keys.length) {
    return { ok: false, reason: 'recipient_not_in_audience' };
  }

  const rowsByRecipientId = new Map(rows.map((row) => [row.recipient.toString(), row]));

  for (const key of body.keys) {
    const row = rowsByRecipientId.get(key.recipientId);

    if (!row) {
      return { ok: false, reason: 'recipient_not_in_audience' };
    }

    if (row.keyVersion !== key.keyVersion) {
      return { ok: false, reason: 'key_version_mismatch' };
    }

    if (
      row.encryptedBroadcastKey !== null &&
      row.encryptedBroadcastKey !== key.encryptedBroadcastKey
    ) {
      return { ok: false, reason: 'encrypted_key_conflict' };
    }
  }

  const writeResult = await BroadcastRecipient.bulkWrite(
    body.keys.map((key) => {
      const row = rowsByRecipientId.get(key.recipientId)!;

      return {
        updateOne: {
          filter: {
            _id: row._id,
            encryptedBroadcastKey: { $in: [null, key.encryptedBroadcastKey] },
          },
          update: { $set: { encryptedBroadcastKey: key.encryptedBroadcastKey } },
        },
      };
    }),
    { ordered: true },
  );

  // A concurrent request may have stored a different ciphertext after our read.
  // The guarded filters ensure it is never overwritten.
  if (writeResult.matchedCount !== body.keys.length) {
    return { ok: false, reason: 'encrypted_key_conflict' };
  }

  const uploadedCount = await BroadcastRecipient.countDocuments({
    broadcast: draft._id,
    encryptedBroadcastKey: { $ne: null },
  }).exec();
  const remainingCount = Math.max(0, draft.audienceSnapshotCount - uploadedCount);

  return {
    ok: true,
    progress: {
      acceptedCount: body.keys.length,
      uploadedCount,
      audienceCount: draft.audienceSnapshotCount,
      remainingCount,
      complete: remainingCount === 0,
    },
  };
};

export default uploadBroadcastRecipientKeys;
export type {
  BroadcastKeyUploadProgress,
  UploadBroadcastRecipientKeysFailureReason,
  UploadBroadcastRecipientKeysResult,
};
