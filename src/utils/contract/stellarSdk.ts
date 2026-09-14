import { createRequire } from 'node:module';
import type * as StellarSdk from '@stellar/stellar-sdk' with { 'resolution-mode': 'import' };

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as typeof StellarSdk;

export default stellarSdk;
