import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { generateKeyPairSync } from 'crypto'
import jwt from 'jsonwebtoken'
import { setPublicKey } from '../src/auth/publicKeyFetcher.js'
import { createApp } from '../src/app.js'
import type { Express } from 'express'

let app: Express
let privateKey: string
let publicKey: string
const testUserId = 'user-123'

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

const UPDATE_GLOBAL_PROFILE = `
  mutation UpdateGlobalProfile($input: GlobalProfileInput!) {
    updateGlobalProfile(input: $input) {
      id
      displayName
      firstName
      lastName
      avatar
      email
      phone
      address
      matrixUsername
      createdAt
      updatedAt
    }
  }
`

const MY_GLOBAL_PROFILE = `
  query MyGlobalProfile {
    myGlobalProfile {
      id
      displayName
      firstName
      lastName
      email
    }
  }
`

const GLOBAL_PROFILE_BY_ID = `
  query GlobalProfile($userId: ID!) {
    globalProfile(userId: $userId) {
      id
      displayName
      email
    }
  }
`

describe('GlobalProfile', () => {
  it('should reject updateGlobalProfile without auth', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: {
            displayName: 'Test User',
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            avatar: '',
          },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    expect(res.body.data?.updateGlobalProfile).toBeNull()
  })

  it('should reject myGlobalProfile without auth', async () => {
    const res = await request(app).post('/graphql').send({ query: MY_GLOBAL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('should create a global profile with valid JWT', async () => {
    const token = makeToken(testUserId)

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: {
            displayName: 'Kurt Mustermann',
            firstName: 'Kurt',
            lastName: 'Mustermann',
            email: 'kurt@example.com',
            avatar: 'https://example.com/avatar.jpg',
            phone: '+49123456789',
            matrixUsername: '@kurt:freischule.info',
          },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.updateGlobalProfile
    expect(profile.id).toBe(testUserId)
    expect(profile.displayName).toBe('Kurt Mustermann')
    expect(profile.firstName).toBe('Kurt')
    expect(profile.lastName).toBe('Mustermann')
    expect(profile.email).toBe('kurt@example.com')
    expect(profile.phone).toBe('+49123456789')
    expect(profile.matrixUsername).toBe('@kurt:freischule.info')
    expect(profile.createdAt).toBeDefined()
    expect(profile.updatedAt).toBeDefined()
  })

  it('should read own global profile with valid JWT', async () => {
    const userId = 'user-read-test'
    const token = makeToken(userId)

    // Create the profile first in this test
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: {
            displayName: 'Kurt Mustermann',
            firstName: 'Kurt',
            lastName: 'Mustermann',
            email: 'kurt@example.com',
            avatar: '',
          },
        },
      })

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: MY_GLOBAL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.myGlobalProfile
    expect(profile.id).toBe(userId)
    expect(profile.displayName).toBe('Kurt Mustermann')
  })

  it('should return null for myGlobalProfile when profile does not exist', async () => {
    const token = makeToken('nonexistent-user')

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: MY_GLOBAL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.myGlobalProfile).toBeNull()
  })

  it('should allow public access to globalProfile by userId', async () => {
    const userId = 'user-public-test'
    const token = makeToken(userId)

    // Create a profile first in this test
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: {
            displayName: 'Public Kurt',
            email: 'public@example.com',
            avatar: '',
            firstName: 'Public',
            lastName: 'Kurt',
          },
        },
      })

    // Access without auth
    const res = await request(app)
      .post('/graphql')
      .send({
        query: GLOBAL_PROFILE_BY_ID,
        variables: { userId },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.globalProfile
    expect(profile.id).toBe(userId)
    expect(profile.displayName).toBe('Public Kurt')
  })

  it('should update an existing global profile', async () => {
    const userId = 'user-update-test'
    const token = makeToken(userId)

    // Create initial profile
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: {
            displayName: 'Initial Name',
            email: 'init@example.com',
            avatar: '',
            firstName: 'Initial',
            lastName: 'Name',
          },
        },
      })

    // Update only the displayName
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_GLOBAL_PROFILE,
        variables: {
          input: { displayName: 'Updated Name' },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.updateGlobalProfile.displayName).toBe('Updated Name')
  })

  it('should reject requests with invalid JWT', async () => {
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', 'Bearer invalidtoken')
      .send({ query: MY_GLOBAL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })
})
