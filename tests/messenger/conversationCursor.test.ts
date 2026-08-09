import { describe, expect, it } from 'vitest';

import {
  decodeConversationCursor,
  encodeConversationCursor,
} from '../../src/utils/messenger/conversationCursor';

describe('messenger conversation cursor', () => {
  it('round-trips an activity timestamp and conversation ID', () => {
    const cursor = {
      lastMessageAt: new Date('2026-08-07T12:00:00.000Z'),
      id: '507f1f77bcf86cd799439011',
    };

    expect(decodeConversationCursor(encodeConversationCursor(cursor))).toEqual(cursor);
  });

  it('supports empty conversations and rejects malformed cursors', () => {
    const cursor = {
      lastMessageAt: null,
      id: '507f1f77bcf86cd799439011',
    };

    expect(decodeConversationCursor(encodeConversationCursor(cursor))).toEqual(cursor);
    expect(decodeConversationCursor('not-a-cursor')).toBeNull();
  });
});
