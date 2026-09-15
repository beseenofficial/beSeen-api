import env from '../../env';
import stellarSdk from './stellarSdk';
import getContractSyncConfig from './contractConfig';
import { decodeContractAura } from './contractAuraCodec';
import type { ContractAuraData } from '../../types/contract/aura';
import networkPassphraseFor from '../stellar/networkPassphraseFor';

const AURA_NOT_FOUND_ERROR_CODE = 11;

const getContractAura = async (contractTokenId: bigint): Promise<ContractAuraData | null> => {
  if (contractTokenId < 1n || contractTokenId > (1n << 64n) - 1n) {
    throw new RangeError('Aura token ID must be within the positive u64 range');
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
      contract.call('get_aura', stellarSdk.nativeToScVal(contractTokenId, { type: 'u64' })),
    )
    .setTimeout(30)
    .build();

  const simulation = await rpcServer.simulateTransaction(transaction);

  if (stellarSdk.rpc.Api.isSimulationError(simulation)) {
    if (
      new RegExp(`Error\\(Contract,\\s*#${AURA_NOT_FOUND_ERROR_CODE}\\)`, 'i').test(
        simulation.error,
      )
    ) {
      return null;
    }
    throw new Error(`get_aura simulation failed: ${simulation.error}`);
  }

  if (!stellarSdk.rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    throw new Error('get_aura simulation returned no result');
  }

  const decoded = decodeContractAura(stellarSdk.scValToNative(simulation.result.retval));

  if (decoded.contractTokenId !== contractTokenId.toString()) {
    throw new Error('get_aura returned a different token ID');
  }

  return decoded;
};

export default getContractAura;
