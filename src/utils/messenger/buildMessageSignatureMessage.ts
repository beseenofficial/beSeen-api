import {
  MESSENGER_CONTENT_ENCRYPTION_SUITE,
  MESSENGER_KEY_WRAP_SUITE,
  MESSENGER_SIGNATURE_VERSION,
} from '../../constant/messenger';

interface MessageSignatureMessageInput {
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  encryptionVersion: number;
  senderKeyVersion: number;
  recipientKeyVersion: number;
  senderSigningPublicKey: string;
  senderEncryptionPublicKey: string;
  recipientEncryptionPublicKey: string;
  contentCiphertext: string;
  contentNonce: string;
  senderEncryptedMessageKey: string;
  recipientEncryptedMessageKey: string;
  replyToMessageId: string | null;
  bounty?: {
    assetCode: string;
    amount: string;
    durationSeconds: number;
  } | null;
}

const buildMessageSignatureMessage = (input: MessageSignatureMessageInput): string => {
  const bounty = input.bounty ?? null;

  return [
    'BeSeen Encrypted Direct Message',
    `Signature Version: ${MESSENGER_SIGNATURE_VERSION}`,
    `Encryption Version: ${input.encryptionVersion}`,
    `Content Suite: ${MESSENGER_CONTENT_ENCRYPTION_SUITE}`,
    `Key Wrap Suite: ${MESSENGER_KEY_WRAP_SUITE}`,
    `Conversation ID: ${input.conversationId.toLowerCase()}`,
    `Client Message ID: ${input.clientMessageId.toLowerCase()}`,
    `Sender ID: ${input.senderId.toLowerCase()}`,
    `Recipient ID: ${input.recipientId.toLowerCase()}`,
    `Sender Key Version: ${input.senderKeyVersion}`,
    `Recipient Key Version: ${input.recipientKeyVersion}`,
    `Sender Signing Public Key: ${input.senderSigningPublicKey}`,
    `Sender Encryption Public Key: ${input.senderEncryptionPublicKey}`,
    `Recipient Encryption Public Key: ${input.recipientEncryptionPublicKey}`,
    `Content Nonce: ${input.contentNonce}`,
    `Content Ciphertext: ${input.contentCiphertext}`,
    `Sender Encrypted Message Key: ${input.senderEncryptedMessageKey}`,
    `Recipient Encrypted Message Key: ${input.recipientEncryptedMessageKey}`,
    `Reply To Message ID: ${input.replyToMessageId?.toLowerCase() ?? 'none'}`,
    `Bounty Asset Code: ${bounty?.assetCode ?? 'none'}`,
    `Bounty Amount: ${bounty?.amount ?? 'none'}`,
    `Bounty Duration Seconds: ${bounty?.durationSeconds ?? 'none'}`,
  ].join('\n');
};

export default buildMessageSignatureMessage;
export type { MessageSignatureMessageInput };
