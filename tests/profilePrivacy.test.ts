import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { generateKeyPairSync } from 'crypto'
import jwt from 'jsonwebtoken'
import { setPublicKey } from '../src/auth/publicKeyFetcher.js'
import { createApp } from '../src/app.js'
import { applyPrivacy, PRIVACY_KEY } from '../src/lib/privacy.js'
import type { Express } from 'express'

let app: Express
let privateKey: string
let publicKey: string

const OWNER = 'owner-1'
const STRANGER = 'stranger-9'

beforeAll(async () => {
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  privateKey = keyPair.privateKey
  publicKey = keyPair.publicKey

  setPublicKey(publicKey)
  const result = await createApp(publicKey)
  app = result.app
})

function makeToken(userId: string): string {
  return jwt.sign({ sub: userId }, privateKey, { algorithm: 'RS256', expiresIn: '1h' })
}

// A messanger-style profile: publicKey is public, key material is owner-only.
function messangerProfile() {
  return {
    publicKey: 'MFkw-public-key',
    keyBackup: 'enc:secret-backup',
    channelKeyring: { v1: 'enc:group-key' },
    [PRIVACY_KEY]: { fields: ['keyBackup', 'channelKeyring'] },
  }
}

async function writeProfile(userId: string, prefix: string, profile: Record<string, unknown>) {
  await request(app).post('/profile').send({ userId, prefix, profile })
}

describe('applyPrivacy (unit)', () => {
  it('returns the document untouched for the owner', () => {
    const data = messangerProfile()
    const result = applyPrivacy(data, true)
    expect(result.hidden).toBe(false)
    expect(result.data).toEqual(data)
  })

  it('strips flagged fields and the meta key for foreign callers', () => {
    const result = applyPrivacy(messangerProfile(), false)
    expect(result.hidden).toBe(false)
    expect(result.data).toEqual({ publicKey: 'MFkw-public-key' })
  })

  it('delivers everything (minus meta) when no privacy flag is set', () => {
    const result = applyPrivacy({ a: 1, b: 2 }, false)
    expect(result.hidden).toBe(false)
    expect(result.data).toEqual({ a: 1, b: 2 })
  })

  it('hides the whole profile for foreign callers when profile=true', () => {
    const result = applyPrivacy({ secret: 'x', [PRIVACY_KEY]: { profile: true } }, false)
    expect(result.hidden).toBe(true)
    expect(result.data).toBeNull()
  })
})

describe('REST privacy enforcement', () => {
  it('strips protected fields for a foreign caller but keeps publicKey', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())

    const res = await request(app)
      .get(`/profile/${OWNER}/messanger`)
      .set('Authorization', `Bearer ${makeToken(STRANGER)}`)

    expect(res.status).toBe(200)
    expect(res.body.profile.publicKey).toBe('MFkw-public-key')
    expect(res.body.profile.keyBackup).toBeUndefined()
    expect(res.body.profile.channelKeyring).toBeUndefined()
    expect(res.body.profile[PRIVACY_KEY]).toBeUndefined()
  })

  it('strips protected fields for an unauthenticated caller', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())

    const res = await request(app).get(`/profile/${OWNER}/messanger`)

    expect(res.status).toBe(200)
    expect(res.body.profile.publicKey).toBe('MFkw-public-key')
    expect(res.body.profile.keyBackup).toBeUndefined()
  })

  it('returns the full document to the owner', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())

    const res = await request(app)
      .get(`/profile/${OWNER}/messanger`)
      .set('Authorization', `Bearer ${makeToken(OWNER)}`)

    expect(res.status).toBe(200)
    expect(res.body.profile.keyBackup).toBe('enc:secret-backup')
    expect(res.body.profile.channelKeyring).toEqual({ v1: 'enc:group-key' })
  })

  it('hides a whole-private profile from foreign callers (404)', async () => {
    await writeProfile(OWNER, 'secret', { data: 'x', [PRIVACY_KEY]: { profile: true } })

    const res = await request(app).get(`/profile/${OWNER}/secret`)
    expect(res.status).toBe(404)
  })

  it('omits whole-private prefixes from the listing for foreign callers', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())
    await writeProfile(OWNER, 'secret', { [PRIVACY_KEY]: { profile: true } })

    const foreign = await request(app).get(`/profile/${OWNER}`)
    expect(foreign.body.prefixes).toContain('messanger')
    expect(foreign.body.prefixes).not.toContain('secret')

    const owner = await request(app)
      .get(`/profile/${OWNER}`)
      .set('Authorization', `Bearer ${makeToken(OWNER)}`)
    expect(owner.body.prefixes).toContain('secret')
  })
})

const MESSANGER_PROFILE = `
  query MessangerProfile($userId: ID!) {
    messangerProfile(userId: $userId)
  }
`
const MY_MESSANGER_PROFILE = `query { myMessangerProfile }`

describe('GraphQL privacy enforcement', () => {
  it('strips protected fields on foreign messangerProfile but keeps publicKey', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${makeToken(STRANGER)}`)
      .send({ query: MESSANGER_PROFILE, variables: { userId: OWNER } })

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.messangerProfile.publicKey).toBe('MFkw-public-key')
    expect(res.body.data.messangerProfile.keyBackup).toBeUndefined()
    expect(res.body.data.messangerProfile.channelKeyring).toBeUndefined()
  })

  it('returns all fields on myMessangerProfile for the owner', async () => {
    await writeProfile(OWNER, 'messanger', messangerProfile())

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${makeToken(OWNER)}`)
      .send({ query: MY_MESSANGER_PROFILE })

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.myMessangerProfile.keyBackup).toBe('enc:secret-backup')
  })

  it('rejects myMessangerProfile without auth', async () => {
    const res = await request(app).post('/graphql').send({ query: MY_MESSANGER_PROFILE })
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('returns null for a whole-private profile on foreign read', async () => {
    await writeProfile(OWNER, 'messanger', {
      publicKey: 'pk',
      [PRIVACY_KEY]: { profile: true },
    })

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${makeToken(STRANGER)}`)
      .send({ query: MESSANGER_PROFILE, variables: { userId: OWNER } })

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.messangerProfile).toBeNull()
  })

  it('updateProfile writes an owner-owned document', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${makeToken(OWNER)}`)
      .send({
        query: `mutation Up($prefix: String!, $profile: JSON!) { updateProfile(prefix: $prefix, profile: $profile) }`,
        variables: { prefix: 'messanger', profile: messangerProfile() },
      })

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.updateProfile.publicKey).toBe('MFkw-public-key')
  })
})
