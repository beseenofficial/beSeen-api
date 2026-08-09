import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { BroadcastDraftCleanupResult } from '../../types/broadcast';

const cleanupExpiredBroadcastDrafts = async (
  now = new Date(),
  batchLimit = 500,
): Promise<BroadcastDraftCleanupResult> => {
  const expiredDrafts = await Broadcast.find({
    status: 'draft',
    expiresAt: { $lte: now },
  })
    .sort({ expiresAt: 1 })
    .limit(batchLimit)
    .exec();

  const expiredDraftIds = expiredDrafts.map((draft) => draft._id);
  let expiredDraftCount = 0;

  if (expiredDraftIds.length > 0) {
    const markResult = await Broadcast.updateMany(
      { _id: { $in: expiredDraftIds }, status: 'draft' },
      { $set: { status: 'canceled', canceledAt: now } },
      { runValidators: true },
    ).exec();
    expiredDraftCount = markResult.modifiedCount;
  }

  // Re-read canceled IDs after the guarded status transition. A broadcast that won a
  // concurrent finalize race is published and therefore can never enter this deletion set.
  const canceledDrafts = await Broadcast.find({ status: 'canceled' })
    .sort({ canceledAt: 1 })
    .limit(batchLimit)
    .exec();

  const canceledDraftIds = canceledDrafts.map((draft) => draft._id);

  if (canceledDraftIds.length === 0) {
    return { expiredDraftCount, deletedDraftCount: 0, deletedRecipientCount: 0 };
  }

  const recipientResult = await BroadcastRecipient.deleteMany({
    broadcast: { $in: canceledDraftIds },
  }).exec();

  const draftResult = await Broadcast.deleteMany({
    _id: { $in: canceledDraftIds },
    status: 'canceled',
  }).exec();

  return {
    expiredDraftCount,
    deletedDraftCount: draftResult.deletedCount,
    deletedRecipientCount: recipientResult.deletedCount,
  };
};

export default cleanupExpiredBroadcastDrafts;
