import { beforeEach, describe, expect, it, vi } from 'vitest';

import readContract from '../../src/utils/contract/readContract';
import getContractAuraPrice from '../../src/utils/contract/getContractAuraPrice';

vi.mock('../../src/utils/contract/readContract', () => ({ default: vi.fn() }));

const readContractMock = vi.mocked(readContract);

describe('getContractAuraPrice', () => {
  beforeEach(() => {
    readContractMock.mockReset();
  });

  it('reads aura_price by subject address and preserves i128 precision', async () => {
    const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

    readContractMock.mockResolvedValue(123_456_789_012_345_678n);

    await expect(getContractAuraPrice(walletAddress)).resolves.toBe('123456789012345678');
    expect(readContractMock).toHaveBeenCalledWith('aura_price', [
      { type: 'address', value: walletAddress },
    ]);
  });

  it('rejects an invalid contract result', async () => {
    readContractMock.mockResolvedValue('invalid');

    await expect(
      getContractAuraPrice('GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR'),
    ).rejects.toThrow('Contract aura price is not an integer');
  });

  it('rejects a zero price that cannot be produced by valid price parameters', async () => {
    readContractMock.mockResolvedValue(0n);

    await expect(
      getContractAuraPrice('GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR'),
    ).rejects.toThrow('Contract aura price must be positive');
  });
});
