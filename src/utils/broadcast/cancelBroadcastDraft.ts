import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';

type CancelBroadcastDraftResult =
  | {
      ok: true;
      canceledNow: boolean;
      canceledAt: Date;
      removedRecipientCount: number;
    }
  | { ok: false; reason: 'draft_not_found' | 'published_broadcast' };

const cancelBroadcastDraft = async (
  creatorId: string,
  draftId: string,
): Promise<CancelBroadcastDraftResult> => {
  let broadcast = await Broadcast.findOne({ _id: draftId, creator: creatorId }).exec();

  if (!broadcast) {
    return { ok: false, reason: 'draft_not_found' };
  }

  if (broadcast.status === 'published') {
    return { ok: false, reason: 'published_broadcast' };
  }

  let canceledNow = false;
  let canceledAt = broadcast.canceledAt ?? new Date();

  if (broadcast.status === 'draft') {
    const updateResult = await Broadcast.updateOne(
      { _id: broadcast._id, creator: creatorId, status: 'draft' },
      { $set: { status: 'canceled', canceledAt } },
      { runValidators: true },
    ).exec();
    canceledNow = updateResult.modifiedCount === 1;

    if (!canceledNow) {
      broadcast = await Broadcast.findOne({ _id: draftId, creator: creatorId }).exec();

      if (!broadcast) {
        return { ok: false, reason: 'draft_not_found' };
      }

      if (broadcast.status === 'published') {
        return { ok: false, reason: 'published_broadcast' };
      }

      canceledAt = broadcast.canceledAt ?? canceledAt;
    }
  }

  const recipientResult = await BroadcastRecipient.deleteMany({
    broadcast: broadcast._id,
  }).exec();

  return {
    ok: true,
    canceledNow,
    canceledAt,
    removedRecipientCount: recipientResult.deletedCount,
  };
};

export default cancelBroadcastDraft;
export type { CancelBroadcastDraftResult };
