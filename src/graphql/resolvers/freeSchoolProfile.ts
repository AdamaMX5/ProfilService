import { GraphQLError } from 'graphql'
import { FreeSchoolProfile } from '../../models/FreeSchoolProfile.js'
import type { GraphQLContext } from '../context.js'

interface FreeSchoolProfileInput {
  role?: 'TEACHER' | 'STUDENT' | 'PARENT'
  classes?: string[]
  courses?: string[]
}

function formatProfile(doc: InstanceType<typeof FreeSchoolProfile> | null) {
  if (!doc) return null
  return {
    id: doc._id,
    role: doc.role,
    classes: doc.classes,
    courses: doc.courses,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export const freeSchoolProfileResolvers = {
  Query: {
    myFreeSchoolProfile: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const profile = await FreeSchoolProfile.findById(context.userId)
      return formatProfile(profile)
    },
  },

  Mutation: {
    updateFreeSchoolProfile: async (
      _parent: unknown,
      args: { input: FreeSchoolProfileInput },
      context: GraphQLContext
    ) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const profile = await FreeSchoolProfile.findByIdAndUpdate(
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
