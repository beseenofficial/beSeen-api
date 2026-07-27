import Broadcast from '../../models/Broadcast';
import type { BroadcastDocument } from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { FinalizeBroadcastBody } from '../../validation/broadcast/finalize';
import verifyEd25519Signature from '../crypto/verifyEd25519Signature';
import buildBroadcastRecipientKeysDigest from './buildBroadcastRecipientKeysDigest';
import buildBroadcastSignatureMessage from './buildBroadcastSignatureMessage';

type FinalizeBroadcastFailure =
  | { reason: 'draft_not_found' }
  | { reason: 'draft_expired' }
  | { reason: 'recipient_keys_incomplete'; remainingCount: number }
  | { reason: 'audience_snapshot_mismatch' }
  | { reason: 'invalid_signature' }
  | { reason: 'finalization_conflict' };

interface PublishedBroadcast {
  id: string;
  clientBroadcastId: string;
  creatorId: string;
  status: 'published';
  audience: {
    type: 'all_active_users' | 'token_holders';
    count: number;
  };
  encryptionVersion: number;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: Date;
}

type FinalizeBroadcastResult =
  | { ok: true; broadcast: PublishedBroadcast; publishedNow: boolean }
  | ({ ok: false } & FinalizeBroadcastFailure);

interface FinalizedFields {
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: Date;
}

const hasSameFinalization = (
  broadcast: BroadcastDocument,
  body: FinalizeBroadcastBody,
  recipientKeysDigest?: string,
): boolean =>
  broadcast.status === 'published' &&
  broadcast.contentCiphertext === body.contentCiphertext &&
  broadcast.contentNonce === body.contentNonce &&
  broadcast.creatorEncryptedBroadcastKey === body.creatorEncryptedBroadcastKey &&
  broadcast.signature === body.signature &&
  (recipientKeysDigest === undefined || broadcast.recipientKeysDigest === recipientKeysDigest);

const serializePublishedBroadcast = (
  broadcast: BroadcastDocument,
  fields?: FinalizedFields,
): PublishedBroadcast => ({
  id: broadcast._id.toString(),
  clientBroadcastId: broadcast.clientBroadcastId,
  creatorId: broadcast.creator.toString(),
  status: 'published',
  audience: {
    type: broadcast.audienceType,
    count: broadcast.audienceSnapshotCount,
  },
  encryptionVersion: broadcast.encryptionVersion,
  contentCiphertext: fields?.contentCiphertext ?? broadcast.contentCiphertext!,
  contentNonce: fields?.contentNonce ?? broadcast.contentNonce!,
  creatorEncryptedBroadcastKey:
    fields?.creatorEncryptedBroadcastKey ?? broadcast.creatorEncryptedBroadcastKey!,
  recipientKeysDigest: fields?.recipientKeysDigest ?? broadcast.recipientKeysDigest!,
  signature: fields?.signature ?? broadcast.signature!,
  publishedAt: fields?.publishedAt ?? broadcast.publishedAt!,
});

const finalizeBroadcast = async (
  creatorId: string,
  draftId: string,
  body: FinalizeBroadcastBody,
): Promise<FinalizeBroadcastResult> => {
  const draft = await Broadcast.findOne({ _id: draftId, creator: creatorId }).exec();

  if (!draft) {
    return { ok: false, reason: 'draft_not_found' };
  }

  if (draft.status === 'canceled') {
    return { ok: false, reason: 'draft_not_found' };
  }

  if (draft.status === 'published') {
    return hasSameFinalization(draft, body)
      ? { ok: true, broadcast: serializePublishedBroadcast(draft), publishedNow: false }
      : { ok: false, reason: 'finalization_conflict' };
  }

  if (draft.expiresAt <= new Date()) {
    return { ok: false, reason: 'draft_expired' };
  }

  const recipients = await BroadcastRecipient.find({ broadcast: draft._id })
    .sort({ recipient: 1 })
    .exec();

  if (recipients.length !== draft.audienceSnapshotCount) {
    return { ok: false, reason: 'audience_snapshot_mismatch' };
  }

  const incompleteCount = recipients.filter((row) => row.encryptedBroadcastKey === null).length;

  if (incompleteCount > 0) {
    return { ok: false, reason: 'recipient_keys_incomplete', remainingCount: incompleteCount };
  }

  const recipientKeysDigest = buildBroadcastRecipientKeysDigest(
    recipients.map((row) => ({
      recipientId: row.recipient.toString(),
      keyVersion: row.keyVersion,
      encryptionPublicKey: row.encryptionPublicKey,
      encryptedBroadcastKey: row.encryptedBroadcastKey!,
    })),
  );
  const signatureMessage = buildBroadcastSignatureMessage({
    broadcastId: draft._id.toString(),
    clientBroadcastId: draft.clientBroadcastId,
    creatorId: draft.creator.toString(),
    creatorKeyVersion: draft.creatorKeyVersion,
    encryptionVersion: draft.encryptionVersion,
    contentCiphertext: body.contentCiphertext,
    contentNonce: body.contentNonce,
    creatorEncryptedBroadcastKey: body.creatorEncryptedBroadcastKey,
    audienceType: draft.audienceType,
    audienceCount: draft.audienceSnapshotCount,
    recipientKeysDigest,
  });

  if (!verifyEd25519Signature(draft.creatorSigningPublicKey, signatureMessage, body.signature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const finalizedFields: FinalizedFields = {
    contentCiphertext: body.contentCiphertext,
    contentNonce: body.contentNonce,
    creatorEncryptedBroadcastKey: body.creatorEncryptedBroadcastKey,
    recipientKeysDigest,
    signature: body.signature,
    publishedAt: new Date(),
  };
  const updateResult = await Broadcast.updateOne(
    { _id: draft._id, creator: creatorId, status: 'draft' },
    { $set: { status: 'published', ...finalizedFields } },
    { runValidators: true },
  ).exec();

  if (updateResult.modifiedCount !== 1) {
    const concurrentlyPublished = await Broadcast.findOne({
      _id: draft._id,
      creator: creatorId,
    }).exec();

    if (
      concurrentlyPublished &&
      hasSameFinalization(concurrentlyPublished, body, recipientKeysDigest)
    ) {
      return {
        ok: true,
        broadcast: serializePublishedBroadcast(concurrentlyPublished),
        publishedNow: false,
      };
    }

    return { ok: false, reason: 'finalization_conflict' };
  }

  return {
    ok: true,
    broadcast: serializePublishedBroadcast(draft, finalizedFields),
    publishedNow: true,
  };
};

export default finalizeBroadcast;
export type { FinalizeBroadcastFailure, FinalizeBroadcastResult, PublishedBroadcast };
