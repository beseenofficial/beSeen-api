const parseRegistrationRequestBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') return body;

  const fields = body as Record<string, unknown>;
  if (typeof fields.payload === 'string') {
    try {
      return JSON.parse(fields.payload) as unknown;
    } catch {
      return body;
    }
  }

  if (typeof fields.keys === 'string') {
    try {
      return { ...fields, keys: JSON.parse(fields.keys) as unknown };
    } catch {
      return body;
    }
  }

  return body;
};

export default parseRegistrationRequestBody;
