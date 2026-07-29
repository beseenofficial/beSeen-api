import { LOGIN_PROOF_VERSION } from '../../constant/auth';

interface LoginProofMessageInput {
  walletAddress: string;
  requestId: string;
  issuedAt: string;
}

const buildLoginProofMessage = (input: LoginProofMessageInput): string =>
  [
    'BeSeen Login',
    `Version: ${LOGIN_PROOF_VERSION}`,
    `Wallet Address: ${input.walletAddress.toUpperCase()}`,
    `Request ID: ${input.requestId.toLowerCase()}`,
    `Issued At: ${new Date(input.issuedAt).toISOString()}`,
  ].join('\n');

export default buildLoginProofMessage;
export type { LoginProofMessageInput };
