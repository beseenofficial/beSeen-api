import { createRequire } from 'node:module';

import type { StellarNetwork } from '../../constant/auth';

interface StellarNetworks {
  PUBLIC: string;
  TESTNET: string;
}

const { Networks } = createRequire(__filename)('@stellar/stellar-sdk') as {
  Networks: StellarNetworks;
};

const networkPassphraseFor = (network: StellarNetwork): string =>
  network === 'public' ? Networks.PUBLIC : Networks.TESTNET;

export default networkPassphraseFor;
