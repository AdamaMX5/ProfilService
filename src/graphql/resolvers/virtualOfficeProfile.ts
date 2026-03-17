import { GraphQLError } from 'graphql'
import { VirtualOfficeProfile } from '../../models/VirtualOfficeProfile.js'
import type { GraphQLContext } from '../context.js'

interface WorkingHoursInput {
  from: string
  to: string
}

interface VacationPeriodInput {
  from: string
  to: string
  note?: string
}

interface VirtualOfficeProfileInput {
  role?: string
  department?: string
  title?: string
  status?: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE'
  availability?: string
  workingHours?: WorkingHoursInput
  vacationPeriods?: VacationPeriodInput[]
}

function formatProfile(doc: InstanceType<typeof VirtualOfficeProfile> | null) {
  if (!doc) return null
  return {
    id: doc._id,
    role: doc.role,
    department: doc.department,
    title: doc.title ?? null,
    status: doc.status,
    availability: doc.availability ?? null,
    workingHours: doc.workingHours ?? null,
    vacationPeriods: doc.vacationPeriods.map((vp) => ({
      from: vp.from.toISOString(),
      to: vp.to.toISOString(),
      note: vp.note ?? null,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export const virtualOfficeProfileResolvers = {
  Query: {
    myVirtualOfficeProfile: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const profile = await VirtualOfficeProfile.findById(context.userId)
      return formatProfile(profile)
    },
  },

  Mutation: {
    updateVirtualOfficeProfile: async (
      _parent: unknown,
      args: { input: VirtualOfficeProfileInput },
      context: GraphQLContext
    ) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const profile = await VirtualOfficeProfile.findByIdAndUpdate(
        context.userId,
        {
          $set: args.input,
          $setOnInsert: { _id: context.userId },
        },
        { upsert: true, new: true, runValidators: false }
      )

      return formatProfile(profile)
    },
  },
}
