import { GraphQLError } from 'graphql'
import { GlobalProfile } from '../../models/GlobalProfile.js'
import type { GraphQLContext } from '../context.js'

interface GlobalProfileInput {
  displayName?: string
  firstName?: string
  lastName?: string
  avatar?: string
  email?: string
  phone?: string
  address?: string
  matrixUsername?: string
}

function formatProfile(doc: InstanceType<typeof GlobalProfile> | null) {
  if (!doc) return null
  return {
    id: doc._id,
    displayName: doc.displayName,
    firstName: doc.firstName,
    lastName: doc.lastName,
    avatar: doc.avatar,
    email: doc.email,
    phone: doc.phone ?? null,
    address: doc.address ?? null,
    matrixUsername: doc.matrixUsername ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export const globalProfileResolvers = {
  Query: {
    myGlobalProfile: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const profile = await GlobalProfile.findById(context.userId)
      return formatProfile(profile)
    },

    globalProfile: async (_parent: unknown, args: { userId: string }) => {
      const profile = await GlobalProfile.findById(args.userId)
      return formatProfile(profile)
    },
  },

  Mutation: {
    updateGlobalProfile: async (
      _parent: unknown,
      args: { input: GlobalProfileInput },
      context: GraphQLContext
    ) => {
      if (!context.isAuthenticated || !context.userId) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const profile = await GlobalProfile.findByIdAndUpdate(
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
