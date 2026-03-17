import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getPublicKey } from './publicKeyFetcher.js'

export interface UserPayload {
  userId: string
}

declare global {
  namespace Express {
    interface Request {
      user: UserPayload | null
    }
  }
}

export function jwtMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null
    next()
    return
  }

  const token = authHeader.slice(7)
  const publicKey = getPublicKey()

  if (!publicKey) {
    req.user = null
    next()
    return
  }

  try {
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload
    const sub = payload.sub

    if (!sub) {
      req.user = null
    } else {
      req.user = { userId: sub }
    }
  } catch {
    req.user = null
  }

  next()
}
