const isCanonicalBase64 = (
  value: string,
  {
    minBytes = 0,
    maxBytes = Number.POSITIVE_INFINITY,
  }: { minBytes?: number; maxBytes?: number } = {},
): boolean => {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64');

  return (
    decoded.length >= minBytes && decoded.length <= maxBytes && decoded.toString('base64') === value
  );
};

export default isCanonicalBase64;
