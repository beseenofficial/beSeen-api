import { Types } from 'mongoose';
import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContractBounty from '../../src/models/ContractBounty';
import upsertContractBounty from '../../src/utils/contract/upsertContractBounty';

const sponsorId = new Types.ObjectId('000000000000000000000001');

const beneficiaryId = new Types.ObjectId('000000000000000000000002');

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const recipient = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const observed = {
  contractBountyId: '7',
  sender,
  recipient,
  amount: '20000000',
  deadline: '2000000000',
  status: 'locked' as const,
  observedVia: 'event' as const,
};

const registrationQuery = (registration: unknown) => ({
  select: vi.fn().mockReturnValue({
    lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(registration) }),
  }),
});

const userQuery = (user: unknown) => ({
  select: vi.fn().mockReturnValue({
    lean: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(user) }),
  }),
});

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('upsertContractBounty registration verification', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stores the lock only when its wallets and amount match the registered message', async () => {
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(
      registrationQuery({
        _id: new Types.ObjectId(),
        sponsor: sponsorId,
        beneficiary: beneficiaryId,
        amountUnits: 20_000_000,
      }) as never,
    );
    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(userQuery({ walletAddress: sender }) as never)
      .mockReturnValueOnce(userQuery({ walletAddress: recipient }) as never);
    const stored = { ...observed, save: vi.fn() };

    const upsertSpy = vi
      .spyOn(ContractBounty, 'findOneAndUpdate')
      .mockReturnValue(execQuery(stored) as never);

    await expect(upsertContractBounty(observed)).resolves.toBe(stored);
    expect(upsertSpy).toHaveBeenCalledOnce();
  });

  it("rejects and marks a registration failed when it points at somebody else's lock", async () => {
    const registrationId = new Types.ObjectId();
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(
      registrationQuery({
        _id: registrationId,
        sponsor: sponsorId,
        beneficiary: beneficiaryId,
        amountUnits: 20_000_000,
      }) as never,
    );
    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(userQuery({ walletAddress: recipient }) as never)
      .mockReturnValueOnce(userQuery({ walletAddress: sender }) as never);
    const contractUpsertSpy = vi.spyOn(ContractBounty, 'findOneAndUpdate');

    const registrationUpdateSpy = vi
      .spyOn(MessageBounty, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    await expect(upsertContractBounty(observed)).resolves.toBeNull();
    expect(contractUpsertSpy).not.toHaveBeenCalled();
    expect(registrationUpdateSpy).toHaveBeenCalledWith(
      { _id: registrationId, fundingStatus: 'contract_locked' },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'expired', settlementStatus: 'failed' }),
      }),
      { runValidators: true },
    );
  });
});
