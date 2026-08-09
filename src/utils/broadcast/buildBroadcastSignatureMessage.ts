import type { BroadcastSignatureMessageInput } from '../../types/broadcast';
import {
  BROADCAST_CONTENT_ENCRYPTION_SUITE,
  BROADCAST_KEY_WRAP_SUITE,
  BROADCAST_SIGNATURE_VERSION,
} from '../../constant/broadcast';

const buildBroadcastSignatureMessage = (input: BroadcastSignatureMessageInput): string =>
  [
    'BeSeen Encrypted Broadcast',
    `Signature Version: ${BROADCAST_SIGNATURE_VERSION}`,
    `Encryption Version: ${input.encryptionVersion}`,
    `Content Suite: ${BROADCAST_CONTENT_ENCRYPTION_SUITE}`,
    `Key Wrap Suite: ${BROADCAST_KEY_WRAP_SUITE}`,
    `Broadcast ID: ${input.broadcastId.toLowerCase()}`,
    `Client Broadcast ID: ${input.clientBroadcastId.toLowerCase()}`,
    `Creator ID: ${input.creatorId.toLowerCase()}`,
    `Creator Key Version: ${input.creatorKeyVersion}`,
    `Content Nonce: ${input.contentNonce}`,
    `Content Ciphertext: ${input.contentCiphertext}`,
    `Creator Encrypted Broadcast Key: ${input.creatorEncryptedBroadcastKey}`,
    `Audience Type: ${input.audienceType}`,
    `Audience Count: ${input.audienceCount}`,
    `Recipient Keys Digest: ${input.recipientKeysDigest}`,
  ].join('\n');

export default buildBroadcastSignatureMessage;
