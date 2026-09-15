import mongoose from 'mongoose';

import Broadcast from '../models/Broadcast';
import BroadcastRecipient from '../models/BroadcastRecipient';

const dropCollectionIfPresent = async (name: string): Promise<boolean> => {
  const exists = await mongoose.connection.db
    ?.listCollections({ name }, { nameOnly: true })
    .hasNext();
  if (!exists) {
    return false;
  }
  await mongoose.connection.db!.dropCollection(name);
  return true;
};

const replaceDemoTokensWithAura = async () => {
  const broadcasts = await Broadcast.collection.updateMany(
    { audienceType: 'token_holders' },
    { $set: { audienceType: 'demo_all_users' } },
  );

  const recipients = await BroadcastRecipient.collection.updateMany(
    { $or: [{ accessMode: 'token' }, { tokenId: { $exists: true } }] },
    { $set: { accessMode: 'demo', auraTokenId: null }, $unset: { tokenId: '' } },
  );

  const [droppedUserTokens, droppedTokenHoldings] = await Promise.all([
    dropCollectionIfPresent('usertokens'),
    dropCollectionIfPresent('tokenholdings'),
  ]);

  return {
    migratedBroadcasts: broadcasts.modifiedCount,
    migratedRecipients: recipients.modifiedCount,
    droppedUserTokens,
    droppedTokenHoldings,
  };
};

export default replaceDemoTokensWithAura;
