import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import processAvatar, { InvalidAvatarError } from '../../src/utils/avatar/processAvatar';

describe('processAvatar', () => {
  it('normalizes supported input to a square metadata-free WebP', async () => {
    const input = await sharp({
      create: { width: 640, height: 320, channels: 3, background: '#abcdef' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const output = await processAvatar(input);
    const metadata = await sharp(output).metadata();

    expect(metadata).toMatchObject({ format: 'webp', width: 512, height: 512 });
    expect(metadata.orientation).toBeUndefined();
  });

  it('rejects corrupt data and images that are too small', async () => {
    const tooSmall = await sharp({
      create: { width: 127, height: 128, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();

    await expect(processAvatar(Buffer.from('invalid'))).rejects.toBeInstanceOf(InvalidAvatarError);
    await expect(processAvatar(tooSmall)).rejects.toBeInstanceOf(InvalidAvatarError);
  });
});
