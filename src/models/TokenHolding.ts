import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

interface ITokenHolding {
  token: Types.ObjectId;
  holder: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type TokenHoldingDocument = HydratedDocument<ITokenHolding>;

const tokenHoldingSchema = new Schema<ITokenHolding>(
  {
    token: {
      type: Schema.Types.ObjectId,
      ref: 'UserToken',
      required: true,
      immutable: true,
    },
    holder: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

tokenHoldingSchema.index(
  { token: 1, holder: 1 },
  { unique: true, name: 'token_holdings_token_holder_unique' },
);
tokenHoldingSchema.index({ holder: 1, _id: -1 }, { name: 'token_holdings_holder_list' });

const TokenHolding = model<ITokenHolding>('TokenHolding', tokenHoldingSchema);

export default TokenHolding;
export type { ITokenHolding, TokenHoldingDocument };
