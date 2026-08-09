import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { GetPublicUserKeysResult } from '../../types/user';

const getPublicUserKeys = async (username: string): Promise<GetPublicUserKeysResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();

  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const userKey = await UserKey.findOne({
    user: user._id,
    status: 'active',
    revokedAt: null,
  }).exec();

  if (!userKey) {
    return { ok: false, reason: 'active_keys_not_found' };
  }

  return {
    ok: true,
    user: { id: user._id.toString(), username: user.username },
    keys: {
      derivationVersion: userKey.derivationVersion,
      signing: { algorithm: 'Ed25519', publicKey: userKey.signingPublicKey },
      encryption: { algorithm: 'X25519', publicKey: userKey.encryptionPublicKey },
    },
  };
};

export default getPublicUserKeys;
