import 'dotenv/config'
import { config } from './config/index.js'
import { connectDB, disconnectDB } from './db/connection.js'
import { fetchPublicKey } from './auth/publicKeyFetcher.js'
import { createApp } from './app.js'
import http from 'http'

async function main() {
  console.log('Starting ProfilService...')

  await connectDB()
  console.log('Database connected')

  await fetchPublicKey()
  console.log('Public key fetched from auth server')

  const { app, server } = await createApp()

  const httpServer = http.createServer(app)

  httpServer.listen(config.port, () => {
    console.log(`ProfilService running at http://localhost:${config.port}/graphql`)
  })

  async function gracefulShutdown(signal: string) {
    console.log(`\nReceived ${signal}, shutting down gracefully...`)
    await server.stop()
    await disconnectDB()
    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('Fatal error during startup:', err)
  process.exit(1)
})
