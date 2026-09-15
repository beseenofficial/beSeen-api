import type { AuraTokenStatus } from '../models/AuraToken';

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

export type { AuraPurchaseView, RegisterAuraPurchaseResult };
