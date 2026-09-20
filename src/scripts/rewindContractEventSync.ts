import log from '../logger';
import { connectDatabase, disconnectDatabase } from '../db';
import ContractSyncState from '../models/ContractSyncState';
import {
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_FINANCIAL_SYNC_STATE_ID,
} from '../constant/contract';

const SYNC_STATE_IDS = [
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
  CONTRACT_FINANCIAL_SYNC_STATE_ID,
];

const parseTargetLedger = (value: string | undefined): number => {
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new Error('Usage: npm run sync:rewind -- <ledger>');
  }

  const ledger = Number(value);

  if (!Number.isSafeInteger(ledger)) {
    throw new Error('Target ledger must be a safe integer');
  }

  return ledger;
};

const rewindContractEventSync = async (): Promise<void> => {
  const targetLedger = parseTargetLedger(process.argv[2]);

  await connectDatabase();

  try {
    const before = await ContractSyncState.find({ _id: { $in: SYNC_STATE_IDS } })
      .select({ lastProcessedLedger: 1 })
      .lean()
      .exec();

    // $min never moves a checkpoint forward, so re-running this can only ever
    // replay ledgers. Every event handler is idempotent.
    const result = await ContractSyncState.updateMany(
      { _id: { $in: SYNC_STATE_IDS } },
      { $min: { lastProcessedLedger: targetLedger } },
    ).exec();

    const after = await ContractSyncState.find({ _id: { $in: SYNC_STATE_IDS } })
      .select({ lastProcessedLedger: 1 })
      .lean()
      .exec();

    log.info(
      {
        targetLedger,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        before: before.map((state) => ({ id: state._id, ledger: state.lastProcessedLedger })),
        after: after.map((state) => ({ id: state._id, ledger: state.lastProcessedLedger })),
      },
      'Contract event checkpoints rewound; the poller will replay from the next ledger',
    );
  } finally {
    await disconnectDatabase();
  }
};

void rewindContractEventSync().catch((error: unknown) => {
  log.fatal({ error }, 'Contract event checkpoint rewind failed');
  process.exitCode = 1;
});
