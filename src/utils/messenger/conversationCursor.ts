import type { ConversationCursor } from '../../types/messenger/conversation';

interface EncodedConversationCursor {
  lastMessageAt: string | null;
  id: string;
}

const objectIdPattern = /^[a-f\d]{24}$/i;

const encodeConversationCursor = (cursor: ConversationCursor): string =>
  Buffer.from(
    JSON.stringify({
      lastMessageAt: cursor.lastMessageAt?.toISOString() ?? null,
      id: cursor.id.toLowerCase(),
    } satisfies EncodedConversationCursor),
    'utf8',
  ).toString('base64url');

const decodeConversationCursor = (value: string): ConversationCursor | null => {
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;

    if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
      return null;
    }

    const record = decoded as Record<string, unknown>;

    const keys = Object.keys(record).sort();

    if (keys.length !== 2 || keys[0] !== 'id' || keys[1] !== 'lastMessageAt') {
      return null;
    }

    if (typeof record.id !== 'string' || !objectIdPattern.test(record.id)) {
      return null;
    }

    if (record.lastMessageAt === null) {
      return { id: record.id.toLowerCase(), lastMessageAt: null };
    }

    if (typeof record.lastMessageAt !== 'string') {
      return null;
    }

    const lastMessageAt = new Date(record.lastMessageAt);

    if (
      Number.isNaN(lastMessageAt.getTime()) ||
      lastMessageAt.toISOString() !== record.lastMessageAt
    ) {
      return null;
    }

    return { id: record.id.toLowerCase(), lastMessageAt };
  } catch {
    return null;
  }
};

export { decodeConversationCursor, encodeConversationCursor };
