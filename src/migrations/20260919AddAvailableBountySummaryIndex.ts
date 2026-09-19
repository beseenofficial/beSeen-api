import MessageBounty from '../models/MessageBounty';

const addAvailableBountySummaryIndex = async (): Promise<{ ensuredIndexes: number }> => {
  await MessageBounty.collection.createIndex(
    { beneficiary: 1, status: 1, expiresAt: 1 },
    { name: 'message_bounties_beneficiary_status_expiry' },
  );

  return { ensuredIndexes: 1 };
};

export default addAvailableBountySummaryIndex;
