import { createRequire } from 'node:module';

interface StellarAddressApi {
  StrKey: {
    isValidEd25519PublicKey(value: string): boolean;
  };
}

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as StellarAddressApi;

const isValidStellarGAddress = (value: string): boolean => {
  return stellarSdk.StrKey.isValidEd25519PublicKey(value.trim().toUpperCase());
};

export default isValidStellarGAddress;
