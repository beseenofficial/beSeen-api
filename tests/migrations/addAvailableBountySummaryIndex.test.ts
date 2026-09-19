import { describe, expect, it, vi } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';
import addAvailableBountySummaryIndex from '../../src/migrations/20260919AddAvailableBountySummaryIndex';

describe('addAvailableBountySummaryIndex', () => {
  it('ensures the recipient, status, and expiration compound index', async () => {
    const createIndex = vi
      .spyOn(MessageBounty.collection, 'createIndex')
      .mockResolvedValue('message_bounties_beneficiary_status_expiry');

    await expect(addAvailableBountySummaryIndex()).resolves.toEqual({ ensuredIndexes: 1 });
    expect(createIndex).toHaveBeenCalledWith(
      { beneficiary: 1, status: 1, expiresAt: 1 },
      { name: 'message_bounties_beneficiary_status_expiry' },
    );
  });
});
