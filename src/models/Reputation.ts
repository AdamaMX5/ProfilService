import mongoose, { Schema } from 'mongoose'

export interface IReputation {
  _id: string // userId
  xp: number
  createdAt: Date
  updatedAt: Date
}

// Level is intentionally not stored — it's always derived from `xp` at read time via
// xpProgress() (see ../lib/leveling.ts). That keeps the write path a single atomic `$inc`
// with no follow-up write, and there's no state that can ever desync from `xp`.
const ReputationSchema = new Schema<IReputation>(
  {
    _id: { type: String, required: true },
    xp: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: 'reputations',
  }
)

export const Reputation = mongoose.model<IReputation>('Reputation', ReputationSchema)
