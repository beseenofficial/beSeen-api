import { beforeEach, describe, expect, it, vi } from 'vitest';

import readContract from '../../src/utils/contract/readContract';
import canMessageOnContract from '../../src/utils/contract/canMessageOnContract';

vi.mock('../../src/utils/contract/readContract', () => ({ default: vi.fn() }));

const readContractMock = vi.mocked(readContract);

describe('canMessageOnContract', () => {
  beforeEach(() => {
    readContractMock.mockReset();
  });

  it('reads can_message with both wallet addresses', async () => {
    readContractMock.mockResolvedValue(true);

    await expect(canMessageOnContract('GFIRST', 'GSECOND')).resolves.toBe(true);
    expect(readContractMock).toHaveBeenCalledWith('can_message', [
      { type: 'address', value: 'GFIRST' },
      { type: 'address', value: 'GSECOND' },
    ]);
  });

  it('rejects an invalid non-boolean contract result', async () => {
    readContractMock.mockResolvedValue('true');

    await expect(canMessageOnContract('GFIRST', 'GSECOND')).rejects.toThrow(
      'can_message returned a non-boolean result',
    );
  });
});
