import { createRequire } from 'node:module';

interface StellarPublicKeyVerifier {
  verifyMessage(message: string | Buffer, signature: Buffer): boolean;
}

interface StellarMessageApi {
  Keypair: {
    fromPublicKey(publicKey: string): StellarPublicKeyVerifier;
  };
}

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as StellarMessageApi;

const verifySep53Signature = (
  walletAddress: string,
  message: string,
  signature: string,
): boolean => {
  try {
    const keypair = stellarSdk.Keypair.fromPublicKey(walletAddress);
    return keypair.verifyMessage(message, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
};

export default verifySep53Signature;
