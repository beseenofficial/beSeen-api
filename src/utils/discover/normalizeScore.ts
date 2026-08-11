const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1);

const normalizeLogarithmically = (value: number, cap: number): number => {
  if (value <= 0 || cap <= 0) {
    return 0;
  }

  return clampUnit(Math.log1p(value) / Math.log1p(cap));
};

const calculateRecency = (activityAt: Date | null, now: Date, halfLifeDays: number): number => {
  if (!activityAt || halfLifeDays <= 0) {
    return 0;
  }

  const ageDays = Math.max(0, now.getTime() - activityAt.getTime()) / MILLISECONDS_PER_DAY;

  return clampUnit(2 ** (-ageDays / halfLifeDays));
};

const calculateAgeDays = (createdAt: Date, now: Date): number =>
  Math.max(0, now.getTime() - createdAt.getTime()) / MILLISECONDS_PER_DAY;

export { calculateAgeDays, calculateRecency, clampUnit, normalizeLogarithmically };
