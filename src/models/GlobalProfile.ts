import mongoose, { Schema } from 'mongoose'

export interface IGlobalProfile {
  _id: string
  displayName: string
  firstName: string
  lastName: string
  avatar: string
  email: string
  phone?: string
  address?: string
  matrixUsername?: string
  createdAt: Date
  updatedAt: Date
}

const GlobalProfileSchema = new Schema<IGlobalProfile>(
  {
    _id: { type: String, required: true },
    displayName: { type: String, required: true, default: '' },
    firstName: { type: String, required: true, default: '' },
    lastName: { type: String, required: true, default: '' },
    avatar: { type: String, required: true, default: '' },
    email: { type: String, required: true, default: '' },
    phone: { type: String },
    address: { type: String },
    matrixUsername: { type: String },
  },
  {
    timestamps: true,
    collection: 'global_profiles',
  }
)

export const GlobalProfile = mongoose.model<IGlobalProfile>('GlobalProfile', GlobalProfileSchema)
