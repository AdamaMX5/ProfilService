import dotenv from 'dotenv'

dotenv.config()

// Collect INTERNAL_API_KEY_<SERVICENAME> -> key lookup, one env var per caller service —
// mirrors WaveService's/AuthService's internal-key convention, never a shared master key.
function readInternalApiKeys(): Map<string, string> {
  const keys = new Map<string, string>()
  for (const [envKey, value] of Object.entries(process.env)) {
    if (envKey.startsWith('INTERNAL_API_KEY_') && value) {
      keys.set(envKey.slice('INTERNAL_API_KEY_'.length), value)
    }
  }
  return keys
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const internalApiKeys = readInternalApiKeys()

// Mirrors WaveService's REFERRAL_SECRET length gate: a container that forgets to set a real
// value (e.g. INTERNAL_API_KEY_X=test) shouldn't silently accept a guessable internal key.
if (nodeEnv !== 'test') {
  const weak = [...internalApiKeys.entries()].filter(([, key]) => key.length < 32)
  if (weak.length > 0) {
    throw new Error(
      `INTERNAL_API_KEY_* must be at least 32 characters: ${weak.map(([name]) => name).join(', ')}`
    )
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/profilservice',
  authServerUrl: process.env.AUTH_SERVER_URL ?? 'https://auth.freischule.info',
  nodeEnv,
  internalApiKeys,
}
