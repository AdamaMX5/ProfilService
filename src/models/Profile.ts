import mongoose, { Schema } from 'mongoose'

export interface IProfile {
  userId: string
  prefix: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: String, required: true },
    prefix: { type: String, required: true },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  {
    timestamps: true,
    collection: 'profiles',
  }
)

ProfileSchema.index({ userId: 1, prefix: 1 }, { unique: true })

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema)
