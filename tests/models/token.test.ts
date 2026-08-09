import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import UserToken from '../../src/models/UserToken';
import TokenHolding from '../../src/models/TokenHolding';

describe('demo token models', () => {
  it('allows only one token per user', async () => {
    const token = new UserToken({ owner: new Types.ObjectId() });
    await token.validate();

    expect(UserToken.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { owner: 1 },
          expect.objectContaining({ unique: true, name: 'user_tokens_one_per_owner' }),
        ],
      ]),
    );
  });

  it('prevents duplicate token holdings for the same user', async () => {
    const holding = new TokenHolding({
      token: new Types.ObjectId(),
      holder: new Types.ObjectId(),
    });
    await holding.validate();

    expect(TokenHolding.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { token: 1, holder: 1 },
          expect.objectContaining({
            unique: true,
            name: 'token_holdings_token_holder_unique',
          }),
        ],
      ]),
    );
  });
});
