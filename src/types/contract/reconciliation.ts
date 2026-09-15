interface BountySequenceReconciliationResult {
  checkedBountyId: string;
  found: boolean;
  registered: boolean;
  advancedAcrossObserved: number;
}

interface AuraReconciliationResult {
  checked: number;
  confirmed: number;
  notFound: number;
}

interface UnmirroredBounty {
  contractBountyId: string;
}

interface BountyReconciliationResult {
  checked: number;
  synchronized: number;
  notFound: number;
}

export type {
  AuraReconciliationResult,
  BountyReconciliationResult,
  BountySequenceReconciliationResult,
  UnmirroredBounty,
};
