import type { Request } from 'express'

export interface GraphQLContext {
  userId: string | null
  isAuthenticated: boolean
}

export function createContext(req: Request): GraphQLContext {
  return {
    userId: req.user?.userId ?? null,
    isAuthenticated: !!req.user?.userId,
  }
}
