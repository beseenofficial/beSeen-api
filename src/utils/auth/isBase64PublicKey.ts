import { BASE64_PUBLIC_KEY_PATTERN, PUBLIC_KEY_LENGTH_BYTES } from '../../constant/auth';

const isBase64PublicKey = (value: string): boolean => {
  if (!BASE64_PUBLIC_KEY_PATTERN.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64');

  return decoded.length === PUBLIC_KEY_LENGTH_BYTES && decoded.toString('base64') === value;
};

export default isBase64PublicKey;
