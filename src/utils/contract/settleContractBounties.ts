import env from '../../env';
import stellarSdk from './stellarSdk';
import networkPassphraseFor from '../stellar/networkPassphraseFor';
import { getContractSettlementConfig } from './contractConfig';

interface ContractSettlementResult {
  transactionHash: string;
}

const settleContractBounties = async (
  contractBountyIds: bigint[],
): Promise<ContractSettlementResult> => {
  if (contractBountyIds.length === 0 || contractBountyIds.length > 25) {
    throw new RangeError('settle_replies requires between 1 and 25 bounty IDs');
  }

  if (contractBountyIds.some((id) => id < 1n || id > (1n << 64n) - 1n)) {
    throw new RangeError('Every contract bounty ID must be within the positive u64 range');
  }

  const config = getContractSettlementConfig();

  if (!config) {
    throw new Error('BeSeen contract settlement is not configured');
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

  const transaction = new stellarSdk.TransactionBuilder(account, {
    fee: stellarSdk.BASE_FEE,
    networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
  })
    .addOperation(
      contract.call('settle_replies', stellarSdk.nativeToScVal(contractBountyIds, { type: 'u64' })),
    )
    .setTimeout(30)
    .build();

  const preparedTransaction = await rpcServer.prepareTransaction(transaction);
  preparedTransaction.sign(verifier);

  const submission = await rpcServer.sendTransaction(preparedTransaction);

  if (!['PENDING', 'DUPLICATE'].includes(submission.status)) {
    throw new Error(`settle_replies submission failed with status ${submission.status}`);
  }

  const result = await rpcServer.pollTransaction(submission.hash);

  if (result.status !== stellarSdk.rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(
      `settle_replies transaction ${submission.hash} finished with status ${result.status}`,
    );
  }

  return { transactionHash: submission.hash.toLowerCase() };
};

export default settleContractBounties;
export type { ContractSettlementResult };
