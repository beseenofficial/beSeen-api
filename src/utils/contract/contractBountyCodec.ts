import type { ContractBountyData } from '../../types/contract/bounty';

const U64_MAX = (1n << 64n) - 1n;

const I128_MAX = (1n << 127n) - 1n;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asBigInt = (value: unknown, field: string): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value)) {
    return BigInt(value);
  }

  throw new TypeError(`Contract bounty ${field} is not an integer`);
};

const asAddress = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^[CG][A-Z2-7]{55}$/.test(value)) {
    throw new TypeError(`Contract bounty ${field} is not a Stellar address`);
  }

  return value;
};

const statusFromContract = (value: unknown): ContractBountyData['status'] => {
  if (value === 0 || value === 0n || value === '0' || value === 'Locked') {
    return 'locked';
  }
  if (value === 1 || value === 1n || value === '1' || value === 'Settled') {
    return 'settled';
  }
  if (value === 2 || value === 2n || value === '2' || value === 'Refunded') {
    return 'refunded';
  }

  throw new TypeError('Contract bounty status is unknown');
};

const decodeContractBounty = (value: unknown): ContractBountyData => {
  if (!isRecord(value)) {
    throw new TypeError('Contract bounty value must be a record');
  }

  const id = asBigInt(value.id, 'id');

  const amount = asBigInt(value.amount, 'amount');

  const deadline = asBigInt(value.deadline, 'deadline');

  if (id < 1n || id > U64_MAX) {
    throw new RangeError('Contract bounty ID is outside the u64 range');
  }

  if (amount < 1n || amount > I128_MAX) {
    throw new RangeError('Contract bounty amount is outside the positive i128 range');
  }

  if (deadline < 0n || deadline > U64_MAX) {
    throw new RangeError('Contract bounty deadline is outside the u64 range');
  }

  return {
    contractBountyId: id.toString(),
    sender: asAddress(value.sender, 'sender'),
    recipient: asAddress(value.recipient, 'recipient'),
    amount: amount.toString(),
    deadline: deadline.toString(),
    status: statusFromContract(value.status),
  };
};

export default decodeContractBounty;
