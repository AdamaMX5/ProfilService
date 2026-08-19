import fetch from 'node-fetch'
import { config } from '../config/index.js'

let cachedPublicKey: string | null = null

export async function fetchPublicKey(): Promise<string> {
  // AuthService exposes the JWK public key as JSON at /jwt/public-key
  const url = config.authServerUrl + '/jwt/public-key'
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch public key: ' + response.status + ' ' + response.statusText)
  }

  const json = (await response.json()) as { public_key?: string }
  if (!json.public_key) {
    throw new Error('No public_key field in auth server response')
  }
  cachedPublicKey = json.public_key.trim()
  return cachedPublicKey
}

export function getPublicKey(): string | null {
  return cachedPublicKey
}

export function setPublicKey(key: string): void {
  cachedPublicKey = key
}
