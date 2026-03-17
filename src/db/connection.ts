import mongoose from 'mongoose'
import { config } from '../config/index.js'

export async function connectDB(uri?: string): Promise<void> {
  const connectionUri = uri ?? config.mongodbUri
  await mongoose.connect(connectionUri)
  console.log(`MongoDB connected: ${connectionUri}`)
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
  console.log('MongoDB disconnected')
}
