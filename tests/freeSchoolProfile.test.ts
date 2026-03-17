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
const testUserId = 'school-user-789'

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

const UPDATE_FREESCHOOL_PROFILE = `
  mutation UpdateFreeSchoolProfile($input: FreeSchoolProfileInput!) {
    updateFreeSchoolProfile(input: $input) {
      id
      role
      classes
      courses
      createdAt
      updatedAt
    }
  }
`

const MY_FREESCHOOL_PROFILE = `
  query MyFreeSchoolProfile {
    myFreeSchoolProfile {
      id
      role
      classes
      courses
    }
  }
`

describe('FreeSchoolProfile', () => {
  it('should reject updateFreeSchoolProfile without auth', async () => {
    const res = await request(app)
      .post('/graphql')
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: { role: 'TEACHER', classes: ['5A', '6B'], courses: ['Math', 'Physics'] },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('should reject myFreeSchoolProfile without auth', async () => {
    const res = await request(app).post('/graphql').send({ query: MY_FREESCHOOL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  it('should create a freeschool profile for a teacher with valid JWT', async () => {
    const token = makeToken(testUserId)

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: {
            role: 'TEACHER',
            classes: ['5A', '6B', '7C'],
            courses: ['Mathematics', 'Physics', 'Computer Science'],
          },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.updateFreeSchoolProfile
    expect(profile.id).toBe(testUserId)
    expect(profile.role).toBe('TEACHER')
    expect(profile.classes).toEqual(['5A', '6B', '7C'])
    expect(profile.courses).toEqual(['Mathematics', 'Physics', 'Computer Science'])
    expect(profile.createdAt).toBeDefined()
    expect(profile.updatedAt).toBeDefined()
  })

  it('should create a freeschool profile for a student with valid JWT', async () => {
    const studentId = 'student-user-001'
    const token = makeToken(studentId)

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: {
            role: 'STUDENT',
            classes: ['10A'],
            courses: ['German', 'English', 'Biology'],
          },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.updateFreeSchoolProfile
    expect(profile.id).toBe(studentId)
    expect(profile.role).toBe('STUDENT')
    expect(profile.classes).toEqual(['10A'])
  })

  it('should read own freeschool profile with valid JWT', async () => {
    const token = makeToken(testUserId)

    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: { role: 'PARENT', classes: [], courses: [] },
        },
      })

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: MY_FREESCHOOL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    const profile = res.body.data.myFreeSchoolProfile
    expect(profile.id).toBe(testUserId)
    expect(profile.role).toBe('PARENT')
  })

  it('should update classes and courses of existing freeschool profile', async () => {
    const token = makeToken(testUserId)

    await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: { role: 'TEACHER', classes: ['5A'], courses: ['Math'] },
        },
      })

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: UPDATE_FREESCHOOL_PROFILE,
        variables: {
          input: { classes: ['5A', '6B', '7C'] },
        },
      })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.updateFreeSchoolProfile.classes).toEqual(['5A', '6B', '7C'])
  })

  it('should return null for myFreeSchoolProfile when profile does not exist', async () => {
    const token = makeToken('nonexistent-school-user')

    const res = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: MY_FREESCHOOL_PROFILE })

    expect(res.status).toBe(200)
    expect(res.body.errors).toBeUndefined()
    expect(res.body.data.myFreeSchoolProfile).toBeNull()
  })
})
