import {
  BROADCAST_CONTENT_ENCRYPTION_SUITE,
  BROADCAST_ENCRYPTION_VERSION,
  BROADCAST_KEY_WRAP_SUITE,
  BROADCAST_RECIPIENT_PAGE_DEFAULT_LIMIT,
} from '../../constant/broadcast';
import Broadcast from '../../models/Broadcast';
import type { BroadcastDocument } from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { CreateBroadcastDraftBody } from '../../validation/broadcast/draft';
import getBroadcastDraftRecipients from './getBroadcastDraftRecipients';
import type { BroadcastRecipientPage } from './getBroadcastDraftRecipients';
import resolveBroadcastAudience from './resolveBroadcastAudience';

type CreateBroadcastDraftFailureReason =
  'creator_unavailable' | 'creator_required' | 'creator_active_keys_not_found';

interface CreatedBroadcastDraft {
  id: string;
  clientBroadcastId: string;
  status: 'draft';
  audience: {
    type: 'all_active_users';
    count: number;
  };
  encryption: {
    version: number;
    contentSuite: string;
    keyWrapSuite: string;
  };
  creatorKey: {
    keyVersion: number;
    encryptionPublicKey: string;
  };
  recipients: BroadcastRecipientPage;
  createdAt: Date;
}

type CreateBroadcastDraftResult =
  | { ok: true; draft: CreatedBroadcastDraft; created: boolean }
  | { ok: false; reason: CreateBroadcastDraftFailureReason };

interface MongoDuplicateKeyError extends Error {
  code: number;
}

const isDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const serializeDraft = async (draft: BroadcastDocument): Promise<CreatedBroadcastDraft> => {
  const page = await getBroadcastDraftRecipients(draft.creator.toString(), draft._id.toString(), {
    limit: BROADCAST_RECIPIENT_PAGE_DEFAULT_LIMIT,
  });

  if (!page.ok) {
    throw new Error('Broadcast draft audience snapshot is missing');
  }

  return {
    id: draft._id.toString(),
    clientBroadcastId: draft.clientBroadcastId,
    status: 'draft',
    audience: { type: 'all_active_users', count: draft.audienceSnapshotCount },
    encryption: {
      version: draft.encryptionVersion,
      contentSuite: BROADCAST_CONTENT_ENCRYPTION_SUITE,
      keyWrapSuite: BROADCAST_KEY_WRAP_SUITE,
    },
    creatorKey: {
      keyVersion: draft.creatorKeyVersion,
      encryptionPublicKey: draft.creatorEncryptionPublicKey,
    },
    recipients: page.recipients,
    createdAt: draft.createdAt,
  };
};

const findExistingDraft = async (
  creatorId: string,
  clientBroadcastId: string,
): Promise<CreateBroadcastDraftResult | null> => {
  const existing = await Broadcast.findOne({
    creator: creatorId,
    clientBroadcastId,
    status: 'draft',
  }).exec();

  if (!existing) {
    return null;
  }

  return { ok: true, draft: await serializeDraft(existing), created: false };
};

const createBroadcastDraft = async (
  creatorId: string,
  body: CreateBroadcastDraftBody,
): Promise<CreateBroadcastDraftResult> => {
  const creator = await User.findOne({
    _id: creatorId,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!creator) {
    return { ok: false, reason: 'creator_unavailable' };
  }

  if (creator.accountType !== 'creator') {
    return { ok: false, reason: 'creator_required' };
  }

  const existing = await findExistingDraft(creatorId, body.clientBroadcastId);

  if (existing) {
    return existing;
  }

  const creatorKey = await UserKey.findOne({
    user: creator._id,
    status: 'active',
    revokedAt: null,
  }).exec();

  if (!creatorKey) {
    return { ok: false, reason: 'creator_active_keys_not_found' };
  }

  const audience = await resolveBroadcastAudience(creatorId);
  const draft = new Broadcast({
    clientBroadcastId: body.clientBroadcastId,
    creator: creator._id,
    status: 'draft',
    audienceType: 'all_active_users',
    audienceSnapshotCount: audience.length,
    encryptionVersion: BROADCAST_ENCRYPTION_VERSION,
    creatorKeyVersion: creatorKey.derivationVersion,
    creatorSigningPublicKey: creatorKey.signingPublicKey,
    creatorEncryptionPublicKey: creatorKey.encryptionPublicKey,
  });

  try {
    if (audience.length > 0) {
      await BroadcastRecipient.insertMany(
        audience.map((member) => ({
          broadcast: draft._id,
          recipient: member.recipientId,
          username: member.username,
          keyVersion: member.keyVersion,
          encryptionPublicKey: member.encryptionPublicKey,
        })),
        { ordered: true },
      );
    }

    await draft.save();
  } catch (error: unknown) {
    await BroadcastRecipient.deleteMany({ broadcast: draft._id }).exec();

    if (isDuplicateKeyError(error)) {
      const racedDraft = await findExistingDraft(creatorId, body.clientBroadcastId);

      if (racedDraft) {
        return racedDraft;
      }
    }

    throw error;
  }

  return { ok: true, draft: await serializeDraft(draft), created: true };
};

export default createBroadcastDraft;
export type {
  CreatedBroadcastDraft,
  CreateBroadcastDraftFailureReason,
  CreateBroadcastDraftResult,
};
