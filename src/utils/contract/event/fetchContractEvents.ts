import log from '../../../logger';
import stellarSdk from '../stellarSdk';
import getContractSyncConfig from '../contractConfig';
import { CONTRACT_EVENT_PAGE_SIZE } from '../../../constant/contract';

const fetchContractEvents = async (
  stream: string,
  topics: string | readonly string[],
  lastProcessedLedger: number | null,
) => {
  const config = getContractSyncConfig();

  if (!config) {
    throw new Error('BeSeen contract synchronization is not configured');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });

  const health = await rpcServer.getHealth();

  const requestedStartLedger =
    lastProcessedLedger === null ? config.startLedger : lastProcessedLedger + 1;

  if (requestedStartLedger > health.latestLedger) {
    return { events: [], lastProcessedLedger };
  }

  const startLedger = Math.max(requestedStartLedger, health.oldestLedger);

  if (startLedger !== requestedStartLedger) {
    log.warn(
      {
        configuredOrCheckpointLedger: requestedStartLedger,
        oldestAvailableLedger: health.oldestLedger,
        latestAvailableLedger: health.latestLedger,
      },
      'Contract event history before the RPC retention window is unavailable; synchronization will resume from the oldest available ledger',
    );
  }

  let endLedger = Math.min(startLedger + config.eventLedgerBatchSize, health.latestLedger + 1);

  let response;

  while (true) {
    log.info(
      {
        stream,
        startLedger,
        endLedger: endLedger - 1,
        latestLedger: health.latestLedger,
      },
      'Checking contract event ledger range',
    );

    response = await rpcServer.getEvents({
      filters: [
        {
          type: 'contract',
          contractIds: [config.contractId],
          topics: (typeof topics === 'string' ? [topics] : topics).map((topic) => [topic]),
        },
      ],
      startLedger,
      endLedger,
      limit: CONTRACT_EVENT_PAGE_SIZE,
    });

    if (response.events.length < CONTRACT_EVENT_PAGE_SIZE) {
      break;
    }

    const ledgerCount = endLedger - startLedger;

    if (ledgerCount <= 1) {
      throw new Error(
        `Contract event ledger ${startLedger} contains at least ${CONTRACT_EVENT_PAGE_SIZE} matching events; the batch cannot advance without losing events`,
      );
    }

    endLedger = startLedger + Math.ceil(ledgerCount / 2);
  }

  return {
    events: response.events,
    lastProcessedLedger: endLedger - 1,
  };
};

export default fetchContractEvents;
