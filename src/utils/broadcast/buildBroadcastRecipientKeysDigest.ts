import { createHash } from 'node:crypto';
import type { BroadcastRecipientKeyDigestEntry } from '../../types/broadcast';

const buildBroadcastRecipientKeysDigest = (entries: BroadcastRecipientKeyDigestEntry[]): string => {
  const canonicalEntries = entries
    .map((entry) => [
      entry.recipientId.toLowerCase(),
      entry.keyVersion,
      entry.encryptionPublicKey,
      entry.encryptedBroadcastKey,
    ])
    .sort(([firstRecipientId], [secondRecipientId]) => {
      const first = String(firstRecipientId);

      const second = String(secondRecipientId);

      return first < second ? -1 : first > second ? 1 : 0;
    });

  return createHash('sha256').update(JSON.stringify(canonicalEntries), 'utf8').digest('hex');
};

export default buildBroadcastRecipientKeysDigest;
