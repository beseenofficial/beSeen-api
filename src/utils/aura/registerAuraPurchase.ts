import User from '../../models/User';
import type { ClientSession } from 'mongoose';
import AuraToken from '../../models/AuraToken';
import { withDatabaseTransaction } from '../../db';
import confirmAuraPurchase from './confirmAuraPurchase';
import getContractAura from '../contract/getContractAura';
import type {
  RegisteredPurchase,
  RegisterAuraPurchaseBody,
  RegisterAuraPurchaseResult,
} from '../../types/aura';

const registerPending = async (
  authenticatedBuyerId: string,
  subjectUsername: string,
  body: RegisterAuraPurchaseBody,
  session: ClientSession,
): Promise<RegisteredPurchase | RegisterAuraPurchaseResult> => {
  const buyer = await User.findOne({
    _id: authenticatedBuyerId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  const subject = await User.findOne({
    username: subjectUsername,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!buyer) {
    return { ok: false, reason: 'buyer_unavailable' };
  }
  if (!subject) {
    return { ok: false, reason: 'subject_not_found' };
  }
  if (buyer._id.equals(subject._id)) {
    return { ok: false, reason: 'own_aura' };
  }
  if (buyer.walletAddress !== body.buyerAddress || subject.walletAddress !== body.subjectAddress) {
    return { ok: false, reason: 'wallet_mismatch' };
  }

  const existing = await AuraToken.findOne({ contractTokenId: body.tokenId })
    .session(session)
    .exec();
  if (existing) {
    if (
      !existing.buyer.equals(buyer._id) ||
      !existing.subject.equals(subject._id) ||
      existing.purchaseTransactionHash !== body.transactionHash
    ) {
      return { ok: false, reason: 'token_conflict' };
    }
    return {
      created: false,
      buyerId: buyer._id.toString(),
      subjectId: subject._id.toString(),
      subjectUsername: subject.username,
    };
  }

  await AuraToken.create(
    [
      {
        contractTokenId: body.tokenId,
        buyer: buyer._id,
        subject: subject._id,
        buyerAddress: buyer.walletAddress,
        subjectAddress: subject.walletAddress,
        purchaseTransactionHash: body.transactionHash,
        status: 'pending',
      },
    ],
    { session },
  );

  return {
    created: true,
    buyerId: buyer._id.toString(),
    subjectId: subject._id.toString(),
    subjectUsername: subject.username,
  };
};

const registerAuraPurchase = async (
  authenticatedBuyerId: string,
  subjectUsername: string,
  body: RegisterAuraPurchaseBody,
): Promise<RegisterAuraPurchaseResult> => {
  const registered = await withDatabaseTransaction((session) =>
    registerPending(authenticatedBuyerId, subjectUsername, body, session),
  );
  if ('ok' in registered) {
    return registered;
  }

  let conversation: { id: string; created: boolean } | null = null;
  try {
    const aura = await getContractAura(BigInt(body.tokenId));
    if (aura) {
      const confirmation = await confirmAuraPurchase(
        { ...aura, buyer: aura.owner, transactionHash: body.transactionHash },
        'reconciliation',
      );
      conversation = confirmation.conversation;
    }
  } catch {
    // Event polling and the minute reconciliation keep this registration recoverable.
  }

  const purchase = await AuraToken.findOne({ contractTokenId: body.tokenId }).exec();
  if (!purchase) {
    throw new Error('Aura purchase registration could not be loaded');
  }

  return {
    ok: true,
    created: registered.created,
    purchase: {
      tokenId: purchase.contractTokenId,
      buyerId: registered.buyerId,
      subjectId: registered.subjectId,
      subjectUsername: registered.subjectUsername,
      transactionHash: purchase.purchaseTransactionHash,
      status: purchase.status,
      confirmedAt: purchase.confirmedAt,
    },
    conversation,
  };
};

export default registerAuraPurchase;
