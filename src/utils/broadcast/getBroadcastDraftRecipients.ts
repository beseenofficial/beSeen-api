import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { GetBroadcastDraftRecipientsResult } from '../../types/broadcast';
import type { BroadcastRecipientPageQuery } from '../../validation/broadcast/draft';

const getBroadcastDraftRecipients = async (
  creatorId: string,
  draftId: string,
  page: BroadcastRecipientPageQuery,
): Promise<GetBroadcastDraftRecipientsResult> => {
  const draft = await Broadcast.findOne({
    _id: draftId,
    creator: creatorId,
    status: 'draft',
    expiresAt: { $gt: new Date() },
  }).exec();

  if (!draft) {
    return { ok: false, reason: 'draft_not_found' };
  }

  const recipientFilter: Record<string, unknown> = { broadcast: draft._id };

  if (page.cursor) {
    recipientFilter.recipient = { $gt: page.cursor };
  }

  const [rows, uploadedCount] = await Promise.all([
    BroadcastRecipient.find(recipientFilter)
      .sort({ recipient: 1 })
      .limit(page.limit + 1)
      .exec(),
    BroadcastRecipient.countDocuments({
      broadcast: draft._id,
      encryptedBroadcastKey: { $ne: null },
    }).exec(),
  ]);

  const hasMore = rows.length > page.limit;

  const visibleRows = hasMore ? rows.slice(0, page.limit) : rows;

  const lastRow = visibleRows.at(-1);

  return {
    ok: true,
    draft: {
      id: draft._id.toString(),
      clientBroadcastId: draft.clientBroadcastId,
      status: 'draft',
      audienceType: draft.audienceType,
      audienceCount: draft.audienceSnapshotCount,
      progress: {
        uploadedCount,
        remainingCount: Math.max(0, draft.audienceSnapshotCount - uploadedCount),
        complete: uploadedCount === draft.audienceSnapshotCount,
      },
      expiresAt: draft.expiresAt,
    },
    recipients: {
      items: visibleRows.map((row) => ({
        userId: row.recipient.toString(),
        username: row.username,
        keyVersion: row.keyVersion,
        encryptionPublicKey: row.encryptionPublicKey,
        keyUploaded: row.encryptedBroadcastKey !== null,
        encryptedBroadcastKey: row.encryptedBroadcastKey,
      })),
      nextCursor: hasMore && lastRow ? lastRow.recipient.toString() : null,
      hasMore,
    },
  };
};

export default getBroadcastDraftRecipients;
