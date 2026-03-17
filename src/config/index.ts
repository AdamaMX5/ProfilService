import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/profilservice',
  authServerUrl: process.env.AUTH_SERVER_URL ?? 'https://auth.freischule.info',
  nodeEnv: process.env.NODE_ENV ?? 'development',
}
