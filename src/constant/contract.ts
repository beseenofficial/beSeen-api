const CONTRACT_EVENT_PAGE_SIZE = 100;
const CONTRACT_BOUNTY_EVENT_POLL_INTERVAL_MS = 5_000;
const CONTRACT_BOUNTY_RECONCILE_INTERVAL_MS = 60_000;
const CONTRACT_BOUNTY_SYNC_STATE_ID = 'beseen-contract-bounties';
const CONTRACT_BOUNTY_SOURCES = ['event', 'reconciliation'] as const;
const CONTRACT_BOUNTY_STATUSES = ['locked', 'settled', 'refunded'] as const;

type ContractBountyStatus = (typeof CONTRACT_BOUNTY_STATUSES)[number];
type ContractBountySource = (typeof CONTRACT_BOUNTY_SOURCES)[number];

export {
  CONTRACT_BOUNTY_SOURCES,
  CONTRACT_BOUNTY_STATUSES,
  CONTRACT_EVENT_PAGE_SIZE,
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_BOUNTY_RECONCILE_INTERVAL_MS,
  CONTRACT_BOUNTY_EVENT_POLL_INTERVAL_MS,
};
export type { ContractBountySource, ContractBountyStatus };
