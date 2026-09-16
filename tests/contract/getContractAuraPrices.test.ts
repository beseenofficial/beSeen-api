import log from '../../src/logger';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import getContractAuraPrice from '../../src/utils/contract/getContractAuraPrice';
import getContractAuraPrices from '../../src/utils/contract/getContractAuraPrices';

vi.mock('../../src/logger', () => ({ default: { warn: vi.fn() } }));

vi.mock('../../src/utils/contract/getContractAuraPrice', () => ({ default: vi.fn() }));

const getContractAuraPriceMock = vi.mocked(getContractAuraPrice);

const logWarnMock = vi.mocked(log.warn);

describe('getContractAuraPrices', () => {
  beforeEach(() => {
    getContractAuraPriceMock.mockReset();
    logWarnMock.mockReset();
  });

  it('deduplicates addresses and keeps unavailable prices nullable', async () => {
    getContractAuraPriceMock
      .mockResolvedValueOnce('10000000')
      .mockRejectedValueOnce(new Error('RPC unavailable'));

    const prices = await getContractAuraPrices(['first', 'second', 'first']);

    expect(prices).toEqual(
      new Map([
        ['first', '10000000'],
        ['second', null],
      ]),
    );
    expect(getContractAuraPriceMock).toHaveBeenCalledTimes(2);
    expect(logWarnMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: 'second' }),
      'Unable to read current Aura price',
    );
  });
});
