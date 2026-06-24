import { GraphQLError, GraphQLScalarType, Kind } from 'graphql'
import type { ValueNode } from 'graphql'
import { Profile } from '../../models/Profile.js'
import { applyPrivacy } from '../../lib/privacy.js'
import type { GraphQLContext } from '../context.js'

const MESSANGER_PREFIX = 'messanger'

function parseLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value)
    case Kind.NULL:
      return null
    case Kind.LIST:
      return ast.values.map(parseLiteral)
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {}
      for (const field of ast.fields) obj[field.name.value] = parseLiteral(field.value)
      return obj
    }
    default:
      return null
  }
}

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value (free-form profile document)',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
})

function requireAuth(context: GraphQLContext): string {
  if (!context.isAuthenticated || !context.userId) {
    throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } })
  }
  return context.userId
}

// Foreign read path: privacy rules apply unless the caller is the owner.
async function fetchWithPrivacy(
  userId: string,
  prefix: string,
  context: GraphQLContext
): Promise<Record<string, unknown> | null> {
  const doc = await Profile.findOne({ userId, prefix })
  if (!doc) return null
  const isOwner = context.userId === userId
  const { hidden, data } = applyPrivacy(doc.data as Record<string, unknown>, isOwner)
  return hidden ? null : data
}

// Owner read path: requires auth, returns the full document.
async function fetchOwn(prefix: string, context: GraphQLContext): Promise<Record<string, unknown> | null> {
  const userId = requireAuth(context)
  const doc = await Profile.findOne({ userId, prefix })
  return doc ? (doc.data as Record<string, unknown>) : null
}

export const genericProfileResolvers = {
  JSON: JSONScalar,

  Query: {
    profile: (_p: unknown, args: { userId: string; prefix: string }, context: GraphQLContext) =>
      fetchWithPrivacy(args.userId, args.prefix, context),

    myProfile: (_p: unknown, args: { prefix: string }, context: GraphQLContext) =>
      fetchOwn(args.prefix, context),

    messangerProfile: (_p: unknown, args: { userId: string }, context: GraphQLContext) =>
      fetchWithPrivacy(args.userId, MESSANGER_PREFIX, context),

    myMessangerProfile: (_p: unknown, _args: unknown, context: GraphQLContext) =>
      fetchOwn(MESSANGER_PREFIX, context),
  },

  Mutation: {
    updateProfile: async (
      _p: unknown,
      args: { prefix: string; profile: Record<string, unknown> },
      context: GraphQLContext
    ) => {
      const userId = requireAuth(context)
      const updated = await Profile.findOneAndUpdate(
        { userId, prefix: args.prefix },
        { $set: { data: args.profile } },
        { upsert: true, new: true }
      )
      return updated.data
    },
  },
}
