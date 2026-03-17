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
const testUserId = 'office-user-456'

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

const UPDATE_VIRTUAL_OFFICE_PROFILE = `
  mutation UpdateVirtualOfficeProfile($input: VirtualOfficeProfileInput!) {
    updateVirtualOfficeProfile(input: $input) {
      id
      role
      department
      title
      status
      availability
      workingHours {
        from
        to
      }
      vacationPeriods {
        from
        to
        note
      }
      createdAt
      updatedAt
    }
  }
`

const MY_VIRTUAL_OFFICE_PROFILE = `
  query MyVirtualOfficeProfile {
    myVirtualOfficeProfile {
      id
      role
      department
      status
    }
  }
`

describe('VirtualOfficeProfile', () => {
  it('should reject updateVirtualOfficeProfile without auth', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: UPDATE_VIRTUAL_OFFICE_PROFILE,
        variables: {
          input: { role: 'Developer', department: 'Engineering', status: 'ONLINE' },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('should reject myVirtualOfficeProfile without auth', async () => {
    const res = await request(app).post('/graphql').send({ query: MY_VIRTUAL_OFFICE_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('should create a virtual office profile with valid JWT', async () => {
    const token = makeToken(testUserId)

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_VIRTUAL_OFFICE_PROFILE,
        variables: {
          input: {
            role: 'Senior Developer',
            department: 'Engineering',
            title: 'Lead Engineer',
            status: 'ONLINE',
            availability: 'Full-time',
            workingHours: { from: '09:00', to: '17:00' },
            vacationPeriods: [
              { from: '2026-07-01T00:00:00.000Z', to: '2026-07-14T00:00:00.000Z', note: 'Summer vacation' },
            ],
          },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.updateVirtualOfficeProfile
    expect(profile.id).toBe(testUserId)
    expect(profile.role).toBe('Senior Developer')
    expect(profile.department).toBe('Engineering')
    expect(profile.title).toBe('Lead Engineer')
    expect(profile.status).toBe('ONLINE')
    expect(profile.workingHours.from).toBe('09:00')
    expect(profile.workingHours.to).toBe('17:00')
    expect(profile.vacationPeriods).toHaveLength(1)
    expect(profile.vacationPeriods[0].note).toBe('Summer vacation')
  })

  it('should read own virtual office profile with valid JWT', async () => {
    const userId = 'office-read-test'
    const token = makeToken(userId)

    // Create the profile first in this test
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_VIRTUAL_OFFICE_PROFILE,
        variables: {
          input: { role: 'Developer', department: 'Engineering', status: 'AWAY' },
        },
      })

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: MY_VIRTUAL_OFFICE_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.myVirtualOfficeProfile
    expect(profile.id).toBe(userId)
    expect(profile.status).toBe('AWAY')
  })

  it('should update status of existing virtual office profile', async () => {
    const userId = 'office-update-test'
    const token = makeToken(userId)

    // Create profile first in this test
    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_VIRTUAL_OFFICE_PROFILE,
        variables: {
          input: { role: 'Developer', department: 'Engineering', status: 'ONLINE' },
        },
      })

    // Now update only status
    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_VIRTUAL_OFFICE_PROFILE,
        variables: {
          input: { status: 'BUSY' },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.updateVirtualOfficeProfile.status).toBe('BUSY')
  })
})
