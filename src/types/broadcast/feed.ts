import type { BroadcastAudienceType } from '../../constant/broadcast';

interface BroadcastFeedItem {
  id: string;
  clientBroadcastId: string;
  creator: { id: string; username: string; avatar: string | null };
  manifest: {
    signatureVersion: number;
    encryptionVersion: number;
    contentSuite: string;
    keyWrapSuite: string;
    creatorId: string;
    creatorKeyVersion: number;
    contentCiphertext: string;
    contentNonce: string;
    creatorEncryptedBroadcastKey: string;
    audienceType: BroadcastAudienceType;
    audienceCount: number;
    recipientKeysDigest: string;
  };
  viewerKey: {
    source: 'recipient' | 'creator';
    keyVersion: number;
    encryptedBroadcastKey: string;
  };
  integrity: { algorithm: 'Ed25519'; signingPublicKey: string; signature: string };
  publishedAt: Date;
}

interface BroadcastFeedPage {
  view: 'received' | 'sent';
  items: BroadcastFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

type GetBroadcastFeedResult =
  { ok: true; feed: BroadcastFeedPage } | { ok: false; reason: 'account_unavailable' };

export type { BroadcastFeedItem, BroadcastFeedPage, GetBroadcastFeedResult };
