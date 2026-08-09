import UserKey from '../../models/UserKey';
import getConversationAccess from './getConversationAccess';
import type { GetConversationContextResult } from '../../types/messenger/conversation';

const getConversationContext = async (
  userId: string,
  conversationId: string,
): Promise<GetConversationContextResult> => {
  const access = await getConversationAccess(userId, conversationId);

  if (!access.ok) {
    return access;
  }

  const [viewerKey, otherParticipantKey] = await Promise.all([
    UserKey.findOne({ user: access.viewer._id, status: 'active', revokedAt: null }).exec(),
    UserKey.findOne({
      user: access.otherParticipant._id,
      status: 'active',
      revokedAt: null,
    }).exec(),
  ]);

  if (!viewerKey || !otherParticipantKey) {
    return { ok: false, reason: 'active_keys_not_found' };
  }

  return {
    ok: true,
    context: {
      conversationId: access.conversation._id.toString(),
      viewer: {
        id: access.viewer._id.toString(),
        username: access.viewer.username,
        avatar: access.viewer.avatar,
        keyVersion: viewerKey.derivationVersion,
        signingPublicKey: viewerKey.signingPublicKey,
        encryptionPublicKey: viewerKey.encryptionPublicKey,
      },
      otherParticipant: {
        id: access.otherParticipant._id.toString(),
        username: access.otherParticipant.username,
        avatar: access.otherParticipant.avatar,
        keyVersion: otherParticipantKey.derivationVersion,
        signingPublicKey: otherParticipantKey.signingPublicKey,
        encryptionPublicKey: otherParticipantKey.encryptionPublicKey,
      },
    },
  };
};

export default getConversationContext;
