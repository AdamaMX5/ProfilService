import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { typeDefs } from './graphql/typeDefs.js'
import { resolvers } from './graphql/resolvers/index.js'
import { createContext } from './graphql/context.js'
import { jwtMiddleware } from './auth/middleware.js'
import { setPublicKey } from './auth/publicKeyFetcher.js'
import { profileRouter } from './routes/profile.js'
import { reputationRouter } from './routes/reputation.js'
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

  app.use('/profile', profileRouter)
  app.use(reputationRouter)

  app.get('/', (_req, res) => {
    res.send("Hello World! I'm the Profile-MicroService.")
  })

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Mounted last so it catches anything the routes above didn't handle themselves (incl.
  // rejected promises from the async reputation handlers, which Express 5 auto-forwards
  // here). Without this, a DB error on the new unauthenticated GET/API-key-gated POST
  // routes would fall through to Express's default HTML error page — inconsistent with
  // every other endpoint's `{ error }` shape, and a stack trace if NODE_ENV isn't set to
  // production.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error' })
  })

  return { app, server }
}
