import type { ClientSession, Types } from 'mongoose';

import UserToken from '../../models/UserToken';
import type { UserTokenDocument } from '../../models/UserToken';

const getOrCreateUserToken = async (
  ownerId: Types.ObjectId,
  session?: ClientSession,
): Promise<UserTokenDocument> => {
  const token = await UserToken.findOneAndUpdate(
    { owner: ownerId },
    { $setOnInsert: { owner: ownerId } },
    { new: true, upsert: true, setDefaultsOnInsert: true, ...(session ? { session } : {}) },
  ).exec();

  if (!token) throw new Error('User token could not be created');
  return token;
};

export default getOrCreateUserToken;
