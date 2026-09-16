import log from '../../logger';
import syncBountyLockEvents from './event/syncBountyLockEvents';
import syncAuraPurchaseEvents from './event/syncAuraPurchaseEvents';
import syncBountyEarningEvents from './event/syncBountyEarningEvents';
import processNextReplySettlement from './processNextReplySettlement';
import reconcileNextContractBounty from './reconcileNextContractBounty';
import reconcileRegisteredAuraPurchases from './reconcileRegisteredAuraPurchases';
import getContractSyncConfig, { getContractSettlementConfig } from './contractConfig';
import reconcileRegisteredContractBounties from './reconcileRegisteredContractBounties';
import {
  CONTRACT_BOUNTY_EVENT_POLL_INTERVAL_MS,
  CONTRACT_BOUNTY_RECONCILE_INTERVAL_MS,
  CONTRACT_BOUNTY_SETTLEMENT_INTERVAL_MS,
} from '../../constant/contract';

let eventTimer: NodeJS.Timeout | undefined;
let reconciliationTimer: NodeJS.Timeout | undefined;
let settlementTimer: NodeJS.Timeout | undefined;
let eventSyncRunning = false;
let reconciliationRunning = false;
let settlementRunning = false;

const runBountyEventSync = async (): Promise<void> => {
  if (eventSyncRunning) {
    return;
  }

  eventSyncRunning = true;

  try {
    const [bounties, auras, earnings] = await Promise.all([
      syncBountyLockEvents(),
      syncAuraPurchaseEvents(),
      syncBountyEarningEvents(),
    ]);

    if (bounties.processed > 0 || auras.processed > 0 || earnings.processed > 0) {
      log.info({ bounties, auras, earnings }, 'Contract events synchronized');
    }
  } catch (error: unknown) {
    log.error({ error }, 'Contract bounty event synchronization failed');
  } finally {
    eventSyncRunning = false;
  }
};

const runBountyReconciliation = async (): Promise<void> => {
  if (reconciliationRunning) {
    return;
  }

  reconciliationRunning = true;

  try {
    const registered = await reconcileRegisteredContractBounties();

    const sequence = await reconcileNextContractBounty();

    const auras = await reconcileRegisteredAuraPurchases();

    if (
      registered.synchronized > 0 ||
      sequence.found ||
      sequence.advancedAcrossObserved > 0 ||
      auras.confirmed > 0
    ) {
      log.info({ registered, sequence, auras }, 'Contract reconciliation advanced');
    }
  } catch (error: unknown) {
    log.error({ error }, 'Contract bounty reconciliation failed');
  } finally {
    reconciliationRunning = false;
  }
};

const runReplySettlement = async (): Promise<void> => {
  if (settlementRunning) {
    return;
  }

  settlementRunning = true;

  try {
    const processed = await processNextReplySettlement();

    if (processed) {
      log.info('Contract reply bounty settlement processed');
    }
  } catch (error: unknown) {
    log.error({ error }, 'Contract reply bounty settlement failed');
  } finally {
    settlementRunning = false;
  }
};

const startContractBountySync = (): void => {
  if (eventTimer || reconciliationTimer) {
    return;
  }

  if (!getContractSyncConfig()) {
    log.warn('BeSeen contract sync is disabled because its environment is not configured');
    return;
  }

  void runBountyEventSync();
  void runBountyReconciliation();

  eventTimer = setInterval(() => void runBountyEventSync(), CONTRACT_BOUNTY_EVENT_POLL_INTERVAL_MS);
  reconciliationTimer = setInterval(
    () => void runBountyReconciliation(),
    CONTRACT_BOUNTY_RECONCILE_INTERVAL_MS,
  );
  eventTimer.unref();
  reconciliationTimer.unref();

  if (getContractSettlementConfig()) {
    void runReplySettlement();
    settlementTimer = setInterval(
      () => void runReplySettlement(),
      CONTRACT_BOUNTY_SETTLEMENT_INTERVAL_MS,
    );
    settlementTimer.unref();
  } else {
    log.warn('BeSeen contract settlement is disabled because the verifier is not configured');
  }
};

const stopContractBountySync = (): void => {
  if (eventTimer) {
    clearInterval(eventTimer);
    eventTimer = undefined;
  }

  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
    reconciliationTimer = undefined;
  }

  if (settlementTimer) {
    clearInterval(settlementTimer);
    settlementTimer = undefined;
  }
};

export {
  runBountyEventSync,
  runBountyReconciliation,
  runReplySettlement,
  startContractBountySync,
  stopContractBountySync,
};
