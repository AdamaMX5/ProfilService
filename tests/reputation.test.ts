import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import { generateKeyPairSync } from 'crypto'
import type { Express } from 'express'

// config/index.ts parses INTERNAL_API_KEY_* at module-load time, so this must be set before
// src/app.js (and its transitive import of config) is loaded — hence the dynamic imports in
// beforeAll below instead of this file's own static imports.
process.env.INTERNAL_API_KEY_TEST_CALLER = 'test-internal-key-0123456789'
process.env.INTERNAL_API_KEY_SECOND_CALLER = 'second-test-internal-key-abcdef'
const API_KEY = process.env.INTERNAL_API_KEY_TEST_CALLER
const SECOND_API_KEY = process.env.INTERNAL_API_KEY_SECOND_CALLER

let app: Express

beforeAll(async () => {
  const { setPublicKey } = await import('../src/auth/publicKeyFetcher.js')
  const { createApp } = await import('../src/app.js')

  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  setPublicKey(keyPair.publicKey)
  const result = await createApp(keyPair.publicKey)
  app = result.app
})

function fireEvent(userId: string, type: string, apiKey = API_KEY) {
  const req = request(app).post('/internal/xp-events').send({ userId, type })
  return apiKey ? req.set('X-API-Key', apiKey) : req
}

describe('POST /internal/xp-events', () => {
  it('rejects a request with no X-API-Key', async () => {
    const res = await fireEvent('user-1', 'checkin', '')
    expect(res.status).toBe(401)
  })

  it('rejects a request with a wrong X-API-Key', async () => {
    const res = await fireEvent('user-1', 'checkin', 'not-the-real-key')
    expect(res.status).toBe(401)
  })

  it('accepts any registered caller key, not just the first one checked', async () => {
    const res = await fireEvent('user-second-caller', 'checkin', SECOND_API_KEY)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: 'user-second-caller', xp: 20, level: 1 })
  })

  it('rejects a userId that is empty, too long, or contains disallowed characters', async () => {
    const empty = await fireEvent('', 'checkin')
    expect(empty.status).toBe(400)

    const tooLong = await fireEvent('u'.repeat(129), 'checkin')
    expect(tooLong.status).toBe(400)

    const injectionLike = await fireEvent('$ne', 'checkin')
    expect(injectionLike.status).toBe(400)
  })

  it('rejects a missing userId or type', async () => {
    const missingUserId = await request(app)
      .post('/internal/xp-events')
      .set('X-API-Key', API_KEY!)
      .send({ type: 'checkin' })
    expect(missingUserId.status).toBe(400)

    const missingType = await request(app)
      .post('/internal/xp-events')
      .set('X-API-Key', API_KEY!)
      .send({ userId: 'user-1' })
    expect(missingType.status).toBe(400)
  })

  it('accumulates xp across repeated events and reports the derived level', async () => {
    const first = await fireEvent('user-2', 'checkin')
    expect(first.status).toBe(200)
    expect(first.body).toEqual({ userId: 'user-2', xp: 20, level: 1 })

    const second = await fireEvent('user-2', 'wave.contribution')
    expect(second.status).toBe(200)
    expect(second.body).toEqual({ userId: 'user-2', xp: 45, level: 1 })
  })

  it('treats an unknown event type as a 0-xp no-op instead of an error', async () => {
    const res = await fireEvent('user-3', 'some.future.type')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ userId: 'user-3', xp: 0, level: 1 })
  })

  it('crosses a level threshold once accumulated xp reaches it', async () => {
    // wave.contribution = 25xp; level 2 starts at 100xp (xpForLevel(2) = 50*1*2).
    for (let i = 0; i < 3; i += 1) {
      await fireEvent('user-4', 'wave.contribution')
    }
    const stillLevel1 = await fireEvent('user-4', 'wave.join') // 75 + 10 = 85
    expect(stillLevel1.body).toEqual({ userId: 'user-4', xp: 85, level: 1 })

    const levelUp = await fireEvent('user-4', 'wave.share') // 85 + 15 = 100
    expect(levelUp.body).toEqual({ userId: 'user-4', xp: 100, level: 2 })
  })
})

describe('GET /reputation/:userId', () => {
  it('defaults to level 1 / 0 xp for a user with no events yet', async () => {
    const res = await request(app).get('/reputation/never-seen-user')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      userId: 'never-seen-user',
      xp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 100,
    })
  })

  it('requires no auth and reflects accumulated xp', async () => {
    await fireEvent('user-5', 'checkin') // 20xp

    const res = await request(app).get('/reputation/user-5')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      userId: 'user-5',
      xp: 20,
      level: 1,
      xpIntoLevel: 20,
      xpForNextLevel: 100,
    })
  })

  it('reports progress relative to the current level after leveling up', async () => {
    // 300xp lands exactly on the level-3 threshold (xpForLevel(3) = 50*2*3).
    for (let i = 0; i < 12; i += 1) {
      await fireEvent('user-6', 'wave.contribution') // 12 * 25 = 300
    }

    const res = await request(app).get('/reputation/user-6')
    expect(res.body).toEqual({
      userId: 'user-6',
      xp: 300,
      level: 3,
      xpIntoLevel: 0,
      xpForNextLevel: 300, // xpForLevel(4) - xpForLevel(3) = 600 - 300
    })
  })
})
