type ContractParameter =
  | { type: 'address'; value: string }
  | { type: 'u64'; value: bigint }
  | { type: 'u64_array'; value: bigint[] };

interface ContractTransactionResult {
  transactionHash: string;
}

export type { ContractParameter, ContractTransactionResult };
