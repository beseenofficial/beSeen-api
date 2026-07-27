import AuthSession from '../../models/AuthSession';

const revokeAuthSession = async (sessionId: string, userId: string): Promise<void> => {
  await AuthSession.updateOne(
    {
      _id: sessionId,
      user: userId,
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
  ).exec();
};

export default revokeAuthSession;
