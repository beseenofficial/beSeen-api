import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import AuraFollow from '../../models/AuraFollow';
import AuraToken from '../../models/AuraToken';
import type { ObservedAuraPurchase } from '../../types/contract/aura';
import ensureConversation from '../messenger/ensureConversation';

interface AuraConfirmationResult {
  matched: boolean;
  confirmed: boolean;
  conversation: { id: string; created: boolean } | null;
}

const confirmInTransaction = async (
  observed: ObservedAuraPurchase,
  source: 'event' | 'reconciliation',
  session: ClientSession,
): Promise<AuraConfirmationResult> => {
  const registration = await AuraToken.findOne({ contractTokenId: observed.contractTokenId })
    .session(session)
    .exec();

  if (!registration || registration.status === 'failed') {
    return { matched: Boolean(registration), confirmed: false, conversation: null };
  }

  const eventTransactionMismatch =
    source === 'event' &&
    observed.transactionHash !== undefined &&
    registration.purchaseTransactionHash !== observed.transactionHash.toLowerCase();
  const stateMismatch =
    registration.buyerAddress !== observed.buyer ||
    registration.buyerAddress !== observed.owner ||
    registration.subjectAddress !== observed.subject;

  if (eventTransactionMismatch || stateMismatch) {
    registration.status = 'failed';
    registration.failureReason = eventTransactionMismatch
      ? 'Aura purchase transaction hash does not match the observed event'
      : 'On-chain Aura buyer or subject does not match the API registration';
    registration.confirmationSource = source;
    registration.eventId = observed.eventId ?? registration.eventId;
    registration.eventLedger = observed.eventLedger ?? registration.eventLedger;
    await registration.save({ session });
    return { matched: true, confirmed: false, conversation: null };
  }

  const followWrite = await AuraFollow.updateOne(
    { follower: registration.buyer, subject: registration.subject },
    {
      $setOnInsert: {
        follower: registration.buyer,
        subject: registration.subject,
        firstContractTokenId: registration.contractTokenId,
      },
    },
    { upsert: true, session },
  ).exec();
  const ensuredConversation = await ensureConversation(
    registration.buyer,
    registration.subject,
    session,
  );

  if (registration.status !== 'confirmed') {
    registration.status = 'confirmed';
    registration.confirmedAt = new Date();
  }
  registration.confirmationSource = source;
  registration.failureReason = null;
  registration.eventId = observed.eventId ?? registration.eventId;
  registration.eventLedger = observed.eventLedger ?? registration.eventLedger;
  await registration.save({ session });

  return {
    matched: true,
    confirmed: true,
    conversation: {
      id: ensuredConversation.conversation._id.toString(),
      created: ensuredConversation.created || followWrite.upsertedCount === 1,
    },
  };
};

const confirmAuraPurchase = (
  observed: ObservedAuraPurchase,
  source: 'event' | 'reconciliation',
): Promise<AuraConfirmationResult> =>
  withDatabaseTransaction((session) => confirmInTransaction(observed, source, session));

export default confirmAuraPurchase;
export type { AuraConfirmationResult };
