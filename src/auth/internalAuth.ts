import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { config } from '../config/index.js'

declare global {
  namespace Express {
    interface Request {
      callerService?: string
    }
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Still run a compare against a same-length buffer so early-exit timing doesn't leak length.
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

// Requires X-API-Key matching one of the INTERNAL_API_KEY_<SERVICENAME> env vars. On
// success sets req.callerService to the derived caller identity — never trusts a
// caller-supplied identity header. Mirrors WaveService's src/middleware/apiKey.js.
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const presented = req.headers['x-api-key']
  if (!presented || typeof presented !== 'string') {
    res.status(401).json({ error: 'Missing X-API-Key' })
    return
  }

  for (const [serviceName, key] of config.internalApiKeys.entries()) {
    if (constantTimeEquals(presented, key)) {
      req.callerService = serviceName
      next()
      return
    }
  }

  res.status(401).json({ error: 'Invalid API key' })
}
