import type { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import env from '../../env';
import r2Client from '../../storage/r2Client';
import type { StoredAvatar } from '../../types/avatar';

const buildAvatarObjectKey = (userId: Types.ObjectId): string =>
  `avatars/${userId.toString()}/${randomUUID()}.webp`;

const publicAvatarUrl = (objectKey: string): string =>
  `${env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${objectKey}`;

const uploadAvatar = async (userId: Types.ObjectId, body: Buffer): Promise<StoredAvatar> => {
  const objectKey = buildAvatarObjectKey(userId);

  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return { objectKey, publicUrl: publicAvatarUrl(objectKey) };
};

const deleteAvatar = async (objectKey: string): Promise<void> => {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
    }),
  );
};

export { deleteAvatar, uploadAvatar };
