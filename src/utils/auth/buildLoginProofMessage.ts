import { LOGIN_PROOF_VERSION } from '../../constant/auth';
import type { LoginProofMessageInput } from '../../types/auth';

const buildLoginProofMessage = (input: LoginProofMessageInput): string =>
  [
    'BeSeen Login',
    `Version: ${LOGIN_PROOF_VERSION}`,
    `Wallet Address: ${input.walletAddress.toUpperCase()}`,
    `Request ID: ${input.requestId.toLowerCase()}`,
    `Issued At: ${new Date(input.issuedAt).toISOString()}`,
  ].join('\n');

export default buildLoginProofMessage;
