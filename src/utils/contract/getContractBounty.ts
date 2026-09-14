import networkPassphraseFor from '../stellar/networkPassphraseFor';
import env from '../../env';
import type { ContractBountyData } from '../../types/contract/bounty';
import getContractSyncConfig from './contractConfig';
import decodeContractBounty from './contractBountyCodec';
import stellarSdk from './stellarSdk';

const BOUNTY_NOT_FOUND_ERROR_CODE = 16;

const isBountyNotFoundSimulationError = (error: string): boolean =>
  new RegExp(`Error\\(Contract,\\s*#${BOUNTY_NOT_FOUND_ERROR_CODE}\\)`, 'i').test(error);

const getContractBounty = async (contractBountyId: bigint): Promise<ContractBountyData | null> => {
  if (contractBountyId < 1n || contractBountyId > (1n << 64n) - 1n) {
    throw new RangeError('Contract bounty ID must be within the positive u64 range');
  }

  const config = getContractSyncConfig();

  if (!config) {
    throw new Error('BeSeen contract synchronization is not configured');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });

  const source = await rpcServer.getAccount(config.sourceAccount);

  const contract = new stellarSdk.Contract(config.contractId);

  const transaction = new stellarSdk.TransactionBuilder(source, {
    fee: stellarSdk.BASE_FEE,
    networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
  })
    .addOperation(
      contract.call('get_bounty', stellarSdk.nativeToScVal(contractBountyId, { type: 'u64' })),
    )
    .setTimeout(30)
    .build();

  const simulation = await rpcServer.simulateTransaction(transaction);

  if (stellarSdk.rpc.Api.isSimulationError(simulation)) {
    if (isBountyNotFoundSimulationError(simulation.error)) {
      return null;
    }

    throw new Error(`get_bounty simulation failed: ${simulation.error}`);
  }

  if (!stellarSdk.rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    throw new Error('get_bounty simulation returned no result');
  }

  const decoded = decodeContractBounty(stellarSdk.scValToNative(simulation.result.retval));

  if (decoded.contractBountyId !== contractBountyId.toString()) {
    throw new Error('get_bounty returned a different bounty ID');
  }

  return decoded;
};

export default getContractBounty;
