import { SEP53_SIGNATURE_LENGTH_BYTES } from '../../constant/auth';

const BASE64_SEP53_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]{86}==$/;

const isBase64Sep53Signature = (value: string): boolean => {
  if (!BASE64_SEP53_SIGNATURE_PATTERN.test(value)) {
    return false;
  }

  const decoded = Buffer.from(value, 'base64');

  return decoded.length === SEP53_SIGNATURE_LENGTH_BYTES && decoded.toString('base64') === value;
};

export default isBase64Sep53Signature;
export { BASE64_SEP53_SIGNATURE_PATTERN };
