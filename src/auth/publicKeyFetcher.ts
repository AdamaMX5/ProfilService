import fetch from 'node-fetch'
import { config } from '../config/index.js'

let cachedPublicKey: string | null = null

export async function fetchPublicKey(): Promise<string> {
  const url = `${config.authServerUrl}/auth/public-key`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch public key: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  cachedPublicKey = text.trim()
  return cachedPublicKey
}

export function getPublicKey(): string | null {
  return cachedPublicKey
}

export function setPublicKey(key: string): void {
  cachedPublicKey = key
}
