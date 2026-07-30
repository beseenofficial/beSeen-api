const parseProfileUpdateRequestBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') return body;

  const fields = body as Record<string, unknown>;
  if (typeof fields.payload !== 'string') return body;

  try {
    return JSON.parse(fields.payload) as unknown;
  } catch {
    return body;
  }
};

export default parseProfileUpdateRequestBody;
