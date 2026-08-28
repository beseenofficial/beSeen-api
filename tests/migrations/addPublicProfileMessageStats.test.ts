import { afterEach, describe, expect, it, vi } from 'vitest';

import Message from '../../src/models/Message';
import addPublicProfileMessageStats from '../../src/migrations/20260828AddPublicProfileMessageStats';

describe('20260828AddPublicProfileMessageStats migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ensures the recipient count index', async () => {
    const indexSpy = vi.spyOn(Message.collection, 'createIndex').mockResolvedValue('index');

    await expect(addPublicProfileMessageStats()).resolves.toEqual({ ensuredIndexes: 1 });
    expect(indexSpy).toHaveBeenCalledWith({ recipient: 1 }, { name: 'messages_recipient_count' });
  });
});
