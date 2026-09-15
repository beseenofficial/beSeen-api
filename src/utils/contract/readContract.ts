import env from '../../env';
import stellarSdk from './stellarSdk';
import toContractScVal from './toContractScVal';
import getContractSyncConfig from './contractConfig';
import networkPassphraseFor from '../stellar/networkPassphraseFor';
import type { ContractParameter } from '../../types/contract/invocation';

class ContractSimulationError extends Error {
  constructor(
    functionName: string,
    readonly simulationError: string,
  ) {
    super(`${functionName} simulation failed: ${simulationError}`);
    this.name = 'ContractSimulationError';
  }
}

const readContract = async (
  functionName: string,
  parameters: ContractParameter[] = [],
): Promise<unknown> => {
  const config = getContractSyncConfig();

  if (!config) {
    throw new Error('BeSeen contract synchronization is not configured');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });

  const source = await rpcServer.getAccount(config.sourceAccount);

  const contract = new stellarSdk.Contract(config.contractId);

  const contractParameters = parameters.map((parameter) => toContractScVal(parameter));

  const transaction = new stellarSdk.TransactionBuilder(source, {
    fee: stellarSdk.BASE_FEE,
    networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
  })
    .addOperation(contract.call(functionName, ...contractParameters))
    .setTimeout(30)
    .build();

  const simulation = await rpcServer.simulateTransaction(transaction);

  if (stellarSdk.rpc.Api.isSimulationError(simulation)) {
    throw new ContractSimulationError(functionName, simulation.error);
  }

  if (!stellarSdk.rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
    throw new Error(`${functionName} simulation returned no result`);
  }

  return stellarSdk.scValToNative(simulation.result.retval);
};

const isContractErrorCode = (error: unknown, code: number): boolean =>
  error instanceof ContractSimulationError &&
  new RegExp(`Error\\(Contract,\\s*#${code}\\)`, 'i').test(error.simulationError);

export { ContractSimulationError, isContractErrorCode };
export default readContract;
