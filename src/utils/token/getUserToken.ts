import User from '../../models/User';
import getOrCreateUserToken from './getOrCreateUserToken';

type GetUserTokenResult =
  | {
      ok: true;
      token: {
        id: string;
        owner: { id: string; username: string; avatar: string | null };
        createdAt: Date;
      };
    }
  | { ok: false; reason: 'user_not_found' };

const getUserToken = async (username: string): Promise<GetUserTokenResult> => {
  const owner = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!owner) {
    return { ok: false, reason: 'user_not_found' };
  }

  const token = await getOrCreateUserToken(owner._id);
  return {
    ok: true,
    token: {
      id: token._id.toString(),
      owner: { id: owner._id.toString(), username: owner.username, avatar: owner.avatar },
      createdAt: token.createdAt,
    },
  };
};

export default getUserToken;
export type { GetUserTokenResult };
