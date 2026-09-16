import { describe, expect, it } from 'vitest';

import decodeContractBounty from '../../src/utils/contract/contractBountyCodec';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

describe('contract bounty codec', () => {
  it('converts Soroban integer values into JSON-safe strings', () => {
    expect(
      decodeContractBounty({
        id: 1n,
        sender,
        recipient,
        amount: 20_000_000n,
        deadline: 1_700_172_800n,
        status: 0,
      }),
    ).toEqual({
      contractBountyId: '1',
      sender,
      recipient,
      amount: '20000000',
      deadline: '1700172800',
      status: 'locked',
    });
  });

  it.each([
    [0, 'locked'],
    [1, 'settled'],
    [2, 'refunded'],
    ['Locked', 'locked'],
    ['Settled', 'settled'],
    ['Refunded', 'refunded'],
  ])('maps contract status %s to %s', (contractStatus, expected) => {
    const result = decodeContractBounty({
      id: 1n,
      sender,
      recipient,
      amount: 1n,
      deadline: 1n,
      status: contractStatus,
    });

    expect(result.status).toBe(expected);
  });

  it('rejects values outside contract ranges', () => {
    expect(() =>
      decodeContractBounty({
        id: 0n,
        sender,
        recipient,
        amount: 1n,
        deadline: 1n,
        status: 0,
      }),
    ).toThrow('outside the u64 range');
  });
});
