import { Account, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

const wallet = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9));

describe('client key-derivation transaction contract', () => {
  it('builds the fixed KDF transaction deterministically without server input', () => {
    const build = () =>
      new TransactionBuilder(new Account(wallet.publicKey(), '-1'), {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.manageData({
            name: 'beseen_kdf_v1',
            value: 'beseen.fi/key-derivation/v1',
          }),
        )
        .setTimeout(0)
        .build();

    expect(build().toXDR()).toBe(build().toXDR());
  });
});
