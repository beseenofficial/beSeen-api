import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { BroadcastRecipientPageQuery } from '../../validation/broadcast/draft';

interface BroadcastRecipientPublicKey {
  userId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
}

interface BroadcastRecipientPage {
  items: BroadcastRecipientPublicKey[];
  nextCursor: string | null;
  hasMore: boolean;
}

type GetBroadcastDraftRecipientsResult =
  | {
      ok: true;
      draft: {
        id: string;
        clientBroadcastId: string;
        status: 'draft';
        audienceType: 'all_active_users' | 'token_holders';
        audienceCount: number;
      };
      recipients: BroadcastRecipientPage;
    }
  | { ok: false; reason: 'draft_not_found' };

const getBroadcastDraftRecipients = async (
  creatorId: string,
  draftId: string,
  page: BroadcastRecipientPageQuery,
): Promise<GetBroadcastDraftRecipientsResult> => {
  const draft = await Broadcast.findOne({
    _id: draftId,
    creator: creatorId,
    status: 'draft',
  }).exec();

  if (!draft) {
    return { ok: false, reason: 'draft_not_found' };
  }

  const recipientFilter: Record<string, unknown> = { broadcast: draft._id };

  if (page.cursor) {
    recipientFilter.recipient = { $gt: page.cursor };
  }

  const rows = await BroadcastRecipient.find(recipientFilter)
    .sort({ recipient: 1 })
    .limit(page.limit + 1)
    .exec();
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
    },
    recipients: {
      items: visibleRows.map((row) => ({
        userId: row.recipient.toString(),
        username: row.username,
        keyVersion: row.keyVersion,
        encryptionPublicKey: row.encryptionPublicKey,
      })),
      nextCursor: hasMore && lastRow ? lastRow.recipient.toString() : null,
      hasMore,
    },
  };
};

export default getBroadcastDraftRecipients;
export type {
  BroadcastRecipientPage,
  BroadcastRecipientPublicKey,
  GetBroadcastDraftRecipientsResult,
};
