import express from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { typeDefs } from './graphql/typeDefs.js'
import { resolvers } from './graphql/resolvers/index.js'
import { createContext } from './graphql/context.js'
import { jwtMiddleware } from './auth/middleware.js'
import { setPublicKey } from './auth/publicKeyFetcher.js'
import type { GraphQLContext } from './graphql/context.js'
import type { ExpressContextFunctionArgument } from '@as-integrations/express5'

export async function createApp(testPublicKey?: string) {
  if (testPublicKey) {
    setPublicKey(testPublicKey)
  }

  const app = express()

  app.use(express.json())
  // Cast needed due to @types/express version mismatch between top-level and Apollo's bundled copy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(jwtMiddleware as any)

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  })

  await server.start()

  const middleware = expressMiddleware(server, {
    context: async ({ req }: ExpressContextFunctionArgument) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createContext(req as any),
  })

  // Cast due to @types/express version conflict between top-level and Apollo's bundled copy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use('/graphql', middleware as any)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  return { app, server }
}
