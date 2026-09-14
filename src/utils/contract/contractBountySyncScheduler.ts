import log from '../../logger';
import {
  CONTRACT_BOUNTY_EVENT_POLL_INTERVAL_MS,
  CONTRACT_BOUNTY_RECONCILE_INTERVAL_MS,
} from '../../constant/contract';
import getContractSyncConfig from './contractConfig';
import reconcileNextContractBounty from './reconcileNextContractBounty';
import reconcileRegisteredContractBounties from './reconcileRegisteredContractBounties';
import syncBountyEvents from './syncBountyEvents';

let eventTimer: NodeJS.Timeout | undefined;
let reconciliationTimer: NodeJS.Timeout | undefined;
let eventSyncRunning = false;
let reconciliationRunning = false;

const runBountyEventSync = async (): Promise<void> => {
  if (eventSyncRunning) {
    return;
  }

  eventSyncRunning = true;

  try {
    const result = await syncBountyEvents();

    if (result.processed > 0) {
      log.info({ processed: result.processed }, 'Contract bounty events synchronized');
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

    if (registered.synchronized > 0 || sequence.found || sequence.advancedAcrossObserved > 0) {
      log.info({ registered, sequence }, 'Contract bounty reconciliation advanced');
    }
  } catch (error: unknown) {
    log.error({ error }, 'Contract bounty reconciliation failed');
  } finally {
    reconciliationRunning = false;
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
};

export {
  runBountyEventSync,
  runBountyReconciliation,
  startContractBountySync,
  stopContractBountySync,
};
