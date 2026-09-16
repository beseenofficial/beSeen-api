import { Types } from 'mongoose';
import User from '../../src/models/User';
import AuraToken from '../../src/models/AuraToken';
import { withDatabaseTransaction } from '../../src/db';
import getContractAura from '../../src/utils/contract/getContractAura';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import registerAuraPurchase from '../../src/utils/aura/registerAuraPurchase';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../../src/utils/contract/getContractAura', () => ({ default: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);

const getContractAuraMock = vi.mocked(getContractAura);

const buyerAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const subjectAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const buyer = new User({
  _id: new Types.ObjectId(),
  walletAddress: buyerAddress,
  username: 'buyer',
});

const subject = new User({
  _id: new Types.ObjectId(),
  walletAddress: subjectAddress,
  username: 'subject_user',
});

const session = {} as never;

const body = {
  tokenId: '42',
  buyerAddress,
  subjectAddress,
  transactionHash: 'a'.repeat(64),
};

const sessionQuery = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('registerAuraPurchase', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
    getContractAuraMock.mockReset();
    getContractAuraMock.mockResolvedValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

  it('stores a pending claim but does not create access before chain confirmation', async () => {
    vi.spyOn(User, 'findOne')
      .mockReturnValueOnce(sessionQuery(buyer) as never)
      .mockReturnValueOnce(sessionQuery(subject) as never);
    const pending = new AuraToken({
      contractTokenId: '42',
      buyer: buyer._id,
      subject: subject._id,
      buyerAddress,
      subjectAddress,
      purchaseTransactionHash: body.transactionHash,
    });
    vi.spyOn(AuraToken, 'findOne')
      .mockReturnValueOnce(sessionQuery(null) as never)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(pending) } as never);
    const createSpy = vi.spyOn(AuraToken, 'create').mockResolvedValue([pending] as never);

    await expect(
      registerAuraPurchase(buyer._id.toString(), subject.username, body),
    ).resolves.toMatchObject({
      ok: true,
      created: true,
      purchase: { tokenId: '42', status: 'pending' },
      conversation: null,
    });
    expect(createSpy).toHaveBeenCalledWith(
      [expect.objectContaining({ buyer: buyer._id, subject: subject._id, status: 'pending' })],
      { session },
    );
    expect(getContractAuraMock).toHaveBeenCalledWith(42n);
  });

  it('runs user lookups sequentially inside the MongoDB transaction session', async () => {
    let resolveBuyerLookup: ((value: typeof buyer) => void) | undefined;

    const buyerLookup = new Promise<typeof buyer>((resolve) => {
      resolveBuyerLookup = resolve;
    });

    const findUserSpy = vi
      .spyOn(User, 'findOne')
      .mockReturnValueOnce({
        session: vi.fn().mockReturnThis(),
        exec: vi.fn().mockReturnValue(buyerLookup),
      } as never)
      .mockReturnValueOnce(sessionQuery(subject) as never);

    const existing = new AuraToken({
      contractTokenId: '42',
      buyer: buyer._id,
      subject: subject._id,
      buyerAddress,
      subjectAddress,
      purchaseTransactionHash: body.transactionHash,
    });

    vi.spyOn(AuraToken, 'findOne')
      .mockReturnValueOnce(sessionQuery(existing) as never)
      .mockReturnValueOnce({ exec: vi.fn().mockResolvedValue(existing) } as never);

    const registration = registerAuraPurchase(buyer._id.toString(), subject.username, body);

    await vi.waitFor(() => expect(findUserSpy).toHaveBeenCalledOnce());

    if (!resolveBuyerLookup) {
      throw new Error('Buyer lookup resolver was not initialized');
    }

    resolveBuyerLookup(buyer);

    await expect(registration).resolves.toMatchObject({ ok: true, created: false });
    expect(findUserSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects client wallet addresses that do not match authenticated users', async () => {
    vi.spyOn(User, 'findOne')
      .mockReturnValueOnce(sessionQuery(buyer) as never)
      .mockReturnValueOnce(sessionQuery(subject) as never);
    const createSpy = vi.spyOn(AuraToken, 'create');

    await expect(
      registerAuraPurchase(buyer._id.toString(), subject.username, {
        ...body,
        buyerAddress: subjectAddress,
      }),
    ).resolves.toEqual({ ok: false, reason: 'wallet_mismatch' });
    expect(createSpy).not.toHaveBeenCalled();
    expect(getContractAuraMock).not.toHaveBeenCalled();
  });
});
