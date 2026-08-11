import { describe, expect, it } from 'vitest';

import {
  decodeDiscoverCursor,
  encodeDiscoverCursor,
} from '../../src/utils/discover/discoverCursor';

describe('Discover ranking cursor', () => {
  it('round-trips an opaque score and user ID cursor', () => {
    const cursor = {
      score: 73.42,
      id: '507f1f77bcf86cd799439011',
    };

    const encoded = encodeDiscoverCursor(cursor);

    expect(encoded).not.toContain(cursor.id);
    expect(decodeDiscoverCursor(encoded)).toEqual(cursor);
  });

  it('rejects malformed, out-of-range, and extended cursor payloads', () => {
    const outOfRange = Buffer.from(
      JSON.stringify({ score: 101, id: '507f1f77bcf86cd799439011' }),
    ).toString('base64url');

    const extended = Buffer.from(
      JSON.stringify({ score: 50, id: '507f1f77bcf86cd799439011', extra: true }),
    ).toString('base64url');

    expect(decodeDiscoverCursor('invalid')).toBeNull();
    expect(decodeDiscoverCursor(outOfRange)).toBeNull();
    expect(decodeDiscoverCursor(extended)).toBeNull();
  });
});
