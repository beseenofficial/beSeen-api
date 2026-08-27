import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

interface IUserActivityDay {
  user: Types.ObjectId;
  day: Date;
  activeSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

type UserActivityDayDocument = HydratedDocument<IUserActivityDay>;

const userActivityDaySchema = new Schema<IUserActivityDay>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: Date, required: true },
    activeSeconds: { type: Number, min: 0, default: 0, required: true },
  },
  { timestamps: true, versionKey: false },
);

userActivityDaySchema.index({ user: 1, day: 1 }, { unique: true, name: 'user_activity_days_user_day_unique' });
userActivityDaySchema.index({ day: 1 }, { name: 'user_activity_days_recent' });

const UserActivityDay = model<IUserActivityDay>('UserActivityDay', userActivityDaySchema);

export default UserActivityDay;
export type { IUserActivityDay, UserActivityDayDocument };
