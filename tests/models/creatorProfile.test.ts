import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { MAX_CREATOR_CATEGORIES, MAX_CREATOR_SKILLS } from '../../src/constant/profile';
import CreatorProfile from '../../src/models/CreatorProfile';

describe('CreatorProfile model', () => {
  it('normalizes categories and skills and applies defaults', async () => {
    const profile = new CreatorProfile({
      user: new Types.ObjectId(),
      headline: '  Visual storyteller  ',
      categories: [' Photography ', 'photography', 'ART'],
      skills: [' Editing ', 'editing', 'Lighting'],
      websiteUrl: 'https://beseen.example/creator',
    });

    await profile.validate();

    expect(profile.headline).toBe('Visual storyteller');
    expect(profile.categories).toEqual(['photography', 'art']);
    expect(profile.skills).toEqual(['editing', 'lighting']);
    expect(profile.isAvailableForWork).toBe(false);
  });

  it('rejects unsupported website protocols', async () => {
    const profile = new CreatorProfile({
      user: new Types.ObjectId(),
      websiteUrl: 'javascript:alert(1)',
    });

    await expect(profile.validate()).rejects.toMatchObject({
      errors: {
        websiteUrl: expect.anything(),
      },
    });
  });

  it('limits the number of categories and skills', async () => {
    const profile = new CreatorProfile({
      user: new Types.ObjectId(),
      categories: Array.from(
        { length: MAX_CREATOR_CATEGORIES + 1 },
        (_, index) => `category-${index}`,
      ),
      skills: Array.from({ length: MAX_CREATOR_SKILLS + 1 }, (_, index) => `skill-${index}`),
    });

    await expect(profile.validate()).rejects.toMatchObject({
      errors: {
        categories: expect.anything(),
        skills: expect.anything(),
      },
    });
  });

  it('declares a one-to-one unique index for users', () => {
    const indexes = CreatorProfile.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { user: 1 },
          expect.objectContaining({ unique: true, name: 'creator_profiles_user_unique' }),
        ],
      ]),
    );
  });
});
