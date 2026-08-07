import TokenHolding from '../../models/TokenHolding';
import User from '../../models/User';
import UserToken from '../../models/UserToken';

type MyTokensResult =
  | {
      ok: true;
      tokens: Array<{
        id: string;
        owner: { id: string; username: string; avatar: string | null };
        createdAt: Date;
        acquiredAt: Date;
      }>;
    }
  | { ok: false; reason: 'account_unavailable' };

const getMyTokens = async (userId: string): Promise<MyTokensResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const holdings = await TokenHolding.find({ holder: user._id }).sort({ _id: -1 }).exec();
  if (holdings.length === 0) {
    return { ok: true, tokens: [] };
  }

  const tokens = await UserToken.find({ _id: { $in: holdings.map((item) => item.token) } }).exec();
  const tokenById = new Map(tokens.map((token) => [token._id.toString(), token]));
  const owners = await User.find({
    _id: { $in: tokens.map((token) => token.owner) },
    status: 'active',
    deletedAt: null,
  }).exec();
  const ownerById = new Map(owners.map((owner) => [owner._id.toString(), owner]));

  return {
    ok: true,
    tokens: holdings.flatMap((holding) => {
      const token = tokenById.get(holding.token.toString());
      const owner = token ? ownerById.get(token.owner.toString()) : undefined;
      return token && owner
        ? [
            {
              id: token._id.toString(),
              owner: { id: owner._id.toString(), username: owner.username, avatar: owner.avatar },
              createdAt: token.createdAt,
              acquiredAt: holding.createdAt,
            },
          ]
        : [];
    }),
  };
};

export default getMyTokens;
export type { MyTokensResult };
