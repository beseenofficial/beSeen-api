import type { DiscoverRankingCursor } from '../../types/discover';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/;

const encodeDiscoverCursor = (cursor: DiscoverRankingCursor): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeDiscoverCursor = (value: string): DiscoverRankingCursor | null => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    const keys = Object.keys(record).sort();

    if (keys.length !== 2 || keys[0] !== 'id' || keys[1] !== 'score') {
      return null;
    }

    if (
      typeof record.score !== 'number' ||
      !Number.isFinite(record.score) ||
      record.score < 0 ||
      record.score > 100
    ) {
      return null;
    }

    if (typeof record.id !== 'string' || !OBJECT_ID_PATTERN.test(record.id)) {
      return null;
    }

    return { score: record.score, id: record.id };
  } catch {
    return null;
  }
};

export { decodeDiscoverCursor, encodeDiscoverCursor };
