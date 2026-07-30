import sharp from 'sharp';

import {
  AVATAR_ALLOWED_INPUT_FORMATS,
  AVATAR_MAX_INPUT_PIXELS,
  AVATAR_MIN_INPUT_SIZE_PX,
  AVATAR_OUTPUT_SIZE_PX,
  AVATAR_WEBP_QUALITY,
} from '../../constant/avatar';

class InvalidAvatarError extends Error {
  constructor() {
    super('Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels');
    this.name = 'InvalidAvatarError';
  }
}

const processAvatar = async (input: Buffer): Promise<Buffer> => {
  try {
    const image = sharp(input, {
      animated: false,
      failOn: 'warning',
      limitInputPixels: AVATAR_MAX_INPUT_PIXELS,
    });
    const metadata = await image.metadata();

    if (
      !metadata.format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < AVATAR_MIN_INPUT_SIZE_PX ||
      metadata.height < AVATAR_MIN_INPUT_SIZE_PX ||
      !AVATAR_ALLOWED_INPUT_FORMATS.includes(
        metadata.format as (typeof AVATAR_ALLOWED_INPUT_FORMATS)[number],
      )
    ) {
      throw new InvalidAvatarError();
    }

    return await image
      .rotate()
      .resize(AVATAR_OUTPUT_SIZE_PX, AVATAR_OUTPUT_SIZE_PX, {
        fit: 'cover',
        position: 'centre',
        withoutEnlargement: false,
      })
      .webp({ quality: AVATAR_WEBP_QUALITY })
      .toBuffer();
  } catch (error: unknown) {
    if (error instanceof InvalidAvatarError) throw error;
    throw new InvalidAvatarError();
  }
};

export default processAvatar;
export { InvalidAvatarError };
