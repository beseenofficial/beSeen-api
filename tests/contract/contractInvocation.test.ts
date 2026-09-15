import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const transaction = { id: 'transaction' };

  const builder = {
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn(() => transaction),
  };

  return {
    transaction,
    builder,
    getAccount: vi.fn(),
    simulateTransaction: vi.fn(),
    prepareTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    pollTransaction: vi.fn(),
    contractCall: vi.fn(),
    scValToNative: vi.fn(),
    sign: vi.fn(),
    toContractScVal: vi.fn(),
  };
});

vi.mock('../../src/utils/contract/contractConfig', () => ({
  default: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 1,
  }),
  getContractSettlementConfig: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 1,
    verifierSecret: 'SVERIFIER',
  }),
}));

vi.mock('../../src/utils/contract/toContractScVal', () => ({
  default: mocks.toContractScVal,
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: {
    BASE_FEE: '100',
    Contract: vi.fn(function MockContract() {
      return { call: mocks.contractCall };
    }),
    Keypair: {
      fromSecret: vi.fn(() => ({
        publicKey: () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
      })),
    },
    TransactionBuilder: vi.fn(function MockTransactionBuilder() {
      return mocks.builder;
    }),
    rpc: {
      Server: vi.fn(function MockServer() {
        return {
          getAccount: mocks.getAccount,
          simulateTransaction: mocks.simulateTransaction,
          prepareTransaction: mocks.prepareTransaction,
          sendTransaction: mocks.sendTransaction,
          pollTransaction: mocks.pollTransaction,
        };
      }),
      Api: {
        isSimulationError: (result: { kind: string }) => result.kind === 'error',
        isSimulationSuccess: (result: { kind: string }) => result.kind === 'success',
        GetTransactionStatus: { SUCCESS: 'SUCCESS' },
      },
    },
    scValToNative: mocks.scValToNative,
  },
}));

import submitContractTransaction from '../../src/utils/contract/submitContractTransaction';
import readContract, {
  ContractSimulationError,
  isContractErrorCode,
} from '../../src/utils/contract/readContract';

describe('shared contract invocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccount.mockResolvedValue({ id: 'source-account' });
    mocks.contractCall.mockReturnValue({ id: 'operation' });
    mocks.toContractScVal.mockReturnValue({ id: 'scval' });
  });

  it('simulates a typed read and decodes the returned value', async () => {
    mocks.simulateTransaction.mockResolvedValue({
      kind: 'success',
      result: { retval: { id: 'retval' } },
    });
    mocks.scValToNative.mockReturnValue(true);

    await expect(
      readContract('can_message', [{ type: 'address', value: 'GADDRESS' }]),
    ).resolves.toBe(true);
    expect(mocks.toContractScVal).toHaveBeenCalledWith({
      type: 'address',
      value: 'GADDRESS',
    });
    expect(mocks.contractCall).toHaveBeenCalledWith('can_message', { id: 'scval' });
    expect(mocks.simulateTransaction).toHaveBeenCalledWith(mocks.transaction);
  });

  it('exposes typed contract simulation errors for domain wrappers', async () => {
    mocks.simulateTransaction.mockResolvedValue({
      kind: 'error',
      error: 'Error(Contract, #16)',
    });

    const error = await readContract('get_bounty').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ContractSimulationError);
    expect(isContractErrorCode(error, 16)).toBe(true);
  });

  it('prepares, signs, submits, and confirms a typed transaction', async () => {
    const prepared = { sign: mocks.sign };

    mocks.prepareTransaction.mockResolvedValue(prepared);
    mocks.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'A'.repeat(64) });
    mocks.pollTransaction.mockResolvedValue({ status: 'SUCCESS' });

    await expect(
      submitContractTransaction('settle_replies', [{ type: 'u64_array', value: [42n] }]),
    ).resolves.toEqual({ transactionHash: 'a'.repeat(64) });
    expect(mocks.toContractScVal).toHaveBeenCalledWith({
      type: 'u64_array',
      value: [42n],
    });
    expect(mocks.contractCall).toHaveBeenCalledWith('settle_replies', { id: 'scval' });
    expect(mocks.sign).toHaveBeenCalledOnce();
  });
});
