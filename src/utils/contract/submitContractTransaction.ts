import env from '../../env';
import stellarSdk from './stellarSdk';
import toContractScVal from './toContractScVal';
import { getContractSettlementConfig } from './contractConfig';
import networkPassphraseFor from '../stellar/networkPassphraseFor';
import type { ContractParameter, ContractTransactionResult } from '../../types/contract/invocation';

const submitContractTransaction = async (
  functionName: string,
  parameters: ContractParameter[] = [],
): Promise<ContractTransactionResult> => {
  const config = getContractSettlementConfig();

  if (!config) {
    throw new Error('BeSeen contract transaction submission is not configured');
  }

  const verifier = stellarSdk.Keypair.fromSecret(config.verifierSecret);

  if (verifier.publicKey() !== config.sourceAccount) {
    throw new Error('BESEEN_RPC_SOURCE_ACCOUNT does not match BESEEN_VERIFIER_SECRET');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });

  const account = await rpcServer.getAccount(verifier.publicKey());

  const contract = new stellarSdk.Contract(config.contractId);

  const contractParameters = parameters.map((parameter) => toContractScVal(parameter));

  const transaction = new stellarSdk.TransactionBuilder(account, {
    fee: stellarSdk.BASE_FEE,
    networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
  })
    .addOperation(contract.call(functionName, ...contractParameters))
    .setTimeout(30)
    .build();

  const preparedTransaction = await rpcServer.prepareTransaction(transaction);
  preparedTransaction.sign(verifier);

  const submission = await rpcServer.sendTransaction(preparedTransaction);

  if (!['PENDING', 'DUPLICATE'].includes(submission.status)) {
    throw new Error(`${functionName} submission failed with status ${submission.status}`);
  }

  const result = await rpcServer.pollTransaction(submission.hash);

  if (result.status !== stellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `${functionName} transaction ${submission.hash} finished with status ${result.status}`,
    );
  }

  return { transactionHash: submission.hash.toLowerCase() };
};

export default submitContractTransaction;
