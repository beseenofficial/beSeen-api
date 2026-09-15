import type { HydratedDocument, Types } from 'mongoose';

import type { AURA_CONFIRMATION_SOURCES, AURA_TOKEN_STATUSES } from '../constant/aura';

type AuraTokenStatus = (typeof AURA_TOKEN_STATUSES)[number];

type AuraConfirmationSource = (typeof AURA_CONFIRMATION_SOURCES)[number];

interface IAuraFollow {
  follower: Types.ObjectId;
  subject: Types.ObjectId;
  firstContractTokenId: string;
  createdAt: Date;
  updatedAt: Date;
}

type AuraFollowDocument = HydratedDocument<IAuraFollow>;

interface IAuraToken {
  contractTokenId: string;
  buyer: Types.ObjectId;
  subject: Types.ObjectId;
  buyerAddress: string;
  subjectAddress: string;
  purchaseTransactionHash: string;
  status: AuraTokenStatus;
  confirmationSource: AuraConfirmationSource | null;
  eventId: string | null;
  eventLedger: number | null;
  confirmedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuraTokenDocument = HydratedDocument<IAuraToken>;

interface RegisterAuraPurchaseBody {
  tokenId: string;
  buyerAddress: string;
  subjectAddress: string;
  transactionHash: string;
}

interface AuraConfirmationResult {
  matched: boolean;
  confirmed: boolean;
  conversation: { id: string; created: boolean } | null;
}

interface RegisteredPurchase {
  created: boolean;
  buyerId: string;
  subjectId: string;
  subjectUsername: string;
}

interface AuraPurchaseView {
  tokenId: string;
  buyerId: string;
  subjectId: string;
  subjectUsername: string;
  transactionHash: string;
  status: AuraTokenStatus;
  confirmedAt: Date | null;
}

type RegisterAuraPurchaseResult =
  | {
      ok: true;
      created: boolean;
      purchase: AuraPurchaseView;
      conversation: { id: string; created: boolean } | null;
    }
  | {
      ok: false;
      reason:
        | 'buyer_unavailable'
        | 'subject_not_found'
        | 'own_aura'
        | 'wallet_mismatch'
        | 'token_conflict';
    };

export type {
  AuraConfirmationResult,
  AuraConfirmationSource,
  AuraFollowDocument,
  AuraPurchaseView,
  AuraTokenDocument,
  AuraTokenStatus,
  IAuraFollow,
  IAuraToken,
  RegisteredPurchase,
  RegisterAuraPurchaseBody,
  RegisterAuraPurchaseResult,
};
