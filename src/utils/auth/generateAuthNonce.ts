import { randomBytes } from 'node:crypto';

const generateAuthNonce = (): string => randomBytes(32).toString('base64url');

export default generateAuthNonce;
