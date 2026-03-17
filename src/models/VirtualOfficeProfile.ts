import mongoose, { Schema } from 'mongoose'

export type StatusType = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'

export interface IWorkingHours {
  from: string
  to: string
}

export interface IVacationPeriod {
  from: Date
  to: Date
  note?: string
}

export interface IVirtualOfficeProfile {
  _id: string
  role: string
  department: string
  title?: string
  status: StatusType
  availability?: string
  workingHours?: IWorkingHours
  vacationPeriods: IVacationPeriod[]
  createdAt: Date
  updatedAt: Date
}

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
)

const VacationPeriodSchema = new Schema<IVacationPeriod>(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    note: { type: String },
  },
  { _id: false }
)

const VirtualOfficeProfileSchema = new Schema<IVirtualOfficeProfile>(
  {
    _id: { type: String, required: true },
    role: { type: String, required: true, default: '' },
    department: { type: String, required: true, default: '' },
    title: { type: String },
    status: {
      type: String,
      enum: ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'],
      required: true,
      default: 'OFFLINE',
    },
    availability: { type: String },
    workingHours: { type: WorkingHoursSchema },
    vacationPeriods: { type: [VacationPeriodSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'virtualoffice_profiles',
  }
)

export const VirtualOfficeProfile = mongoose.model<IVirtualOfficeProfile>(
  'VirtualOfficeProfile',
  VirtualOfficeProfileSchema
)
