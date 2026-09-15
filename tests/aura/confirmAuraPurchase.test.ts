import { Types } from 'mongoose';
import AuraToken from '../../src/models/AuraToken';
import AuraFollow from '../../src/models/AuraFollow';
import { withDatabaseTransaction } from '../../src/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import confirmAuraPurchase from '../../src/utils/aura/confirmAuraPurchase';
import ensureConversation from '../../src/utils/messenger/ensureConversation';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../../src/utils/messenger/ensureConversation', () => ({ default: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);

const ensureConversationMock = vi.mocked(ensureConversation);

const buyer = new Types.ObjectId();

const subject = new Types.ObjectId();

const buyerAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const subjectAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const session = {} as never;

const findQuery = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('confirmAuraPurchase', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    ensureConversationMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates one follow and conversation only after matching chain evidence', async () => {
    const registration = new AuraToken({
      contractTokenId: '42',
      buyer,
      subject,
      buyerAddress,
      subjectAddress,
      purchaseTransactionHash: 'a'.repeat(64),
    });
    vi.spyOn(AuraToken, 'findOne').mockReturnValue(findQuery(registration) as never);
    vi.spyOn(registration, 'save').mockResolvedValue(registration);
    const followSpy = vi
      .spyOn(AuraFollow, 'updateOne')
      .mockReturnValue(execQuery({ upsertedCount: 1 }) as never);
    ensureConversationMock.mockResolvedValue({
      conversation: { _id: new Types.ObjectId() } as never,
      created: true,
    });

    await expect(
      confirmAuraPurchase(
        {
          contractTokenId: '42',
          owner: buyerAddress,
          buyer: buyerAddress,
          subject: subjectAddress,
          transactionHash: 'a'.repeat(64),
        },
        'event',
      ),
    ).resolves.toMatchObject({ matched: true, confirmed: true });
    expect(followSpy).toHaveBeenCalledWith(
      { follower: buyer, subject },
      { $setOnInsert: { follower: buyer, subject, firstContractTokenId: '42' } },
      { upsert: true, session },
    );
    expect(ensureConversationMock).toHaveBeenCalledWith(buyer, subject, session);
    expect(registration.status).toBe('confirmed');
  });

  it('does not open access for an event with a different transaction hash', async () => {
    const registration = new AuraToken({
      contractTokenId: '42',
      buyer,
      subject,
      buyerAddress,
      subjectAddress,
      purchaseTransactionHash: 'a'.repeat(64),
    });
    vi.spyOn(AuraToken, 'findOne').mockReturnValue(findQuery(registration) as never);
    vi.spyOn(registration, 'save').mockResolvedValue(registration);
    const followSpy = vi.spyOn(AuraFollow, 'updateOne');

    await expect(
      confirmAuraPurchase(
        {
          contractTokenId: '42',
          owner: buyerAddress,
          buyer: buyerAddress,
          subject: subjectAddress,
          transactionHash: 'b'.repeat(64),
        },
        'event',
      ),
    ).resolves.toMatchObject({ matched: true, confirmed: false });
    expect(followSpy).not.toHaveBeenCalled();
    expect(ensureConversationMock).not.toHaveBeenCalled();
    expect(registration.status).toBe('failed');
  });
});
