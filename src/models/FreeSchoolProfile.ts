import mongoose, { Schema } from 'mongoose'

export type FreeSchoolRole = 'TEACHER' | 'STUDENT' | 'PARENT'

export interface IFreeSchoolProfile {
  _id: string
  role: FreeSchoolRole
  classes: string[]
  courses: string[]
  createdAt: Date
  updatedAt: Date
}

const FreeSchoolProfileSchema = new Schema<IFreeSchoolProfile>(
  {
    _id: { type: String, required: true },
    role: {
      type: String,
      enum: ['TEACHER', 'STUDENT', 'PARENT'],
      required: true,
      default: 'STUDENT',
    },
    classes: { type: [String], default: [] },
    courses: { type: [String], default: [] },
  },
  {
    timestamps: true,
    collection: 'freeschool_profiles',
  }
)

export const FreeSchoolProfile = mongoose.model<IFreeSchoolProfile>(
  'FreeSchoolProfile',
  FreeSchoolProfileSchema
)
