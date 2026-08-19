import { Router } from 'express'
import { Reputation } from '../models/Reputation.js'
import { requireApiKey } from '../auth/internalAuth.js'
import { XP_PER_EVENT_TYPE, xpForEventType, xpProgress } from '../lib/leveling.js'

export const reputationRouter = Router()

// Same shape as GitService's repo-name validation (see GitService.md) — bounds an
// otherwise-unbounded upsert `_id` and rejects anything that isn't a plain identifier.
const USER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/

// POST /internal/xp-events — fire-and-forget XP event from WaveService/ActivationService
// (see WaveService.md / ActivationService.md). Unknown `type` is a 0-XP no-op rather than
// a 400, so a future caller adding a new event type never breaks against an unpatched
// ProfileService — same "never blocks the caller" contract the callers already promise.
// requireApiKey is attached per-route, not via router.use(), since routers in this app are
// mounted without a path prefix (see PaymentService.md's documented auth-middleware pitfall).
reputationRouter.post('/internal/xp-events', requireApiKey, async (req, res) => {
  const { userId, type } = (req.body ?? {}) as { userId?: unknown; type?: unknown }

  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId) || typeof type !== 'string' || !type) {
    res.status(400).json({ error: 'userId and type are required' })
    return
  }

  const delta = xpForEventType(type)
  if (delta === 0 && !(type in XP_PER_EVENT_TYPE)) {
    // eslint-disable-next-line no-console
    console.warn(`[reputation] unrecognized xp-event type "${type}" from ${req.callerService}`)
  }

  const doc = await Reputation.findOneAndUpdate(
    { _id: userId },
    { $inc: { xp: delta } },
    { upsert: true, new: true }
  )

  const { level } = xpProgress(doc.xp)
  res.status(200).json({ userId, xp: doc.xp, level })
})

// GET /reputation/:userId — no auth. Level/XP is a visible reputation signal by design
// (whitepaper's public status ranks), same visibility model as e.g. GlobalProfile.avatar.
reputationRouter.get('/reputation/:userId', async (req, res) => {
  const { userId } = req.params
  const doc = await Reputation.findById(userId)
  const { level, xpIntoLevel, xpForNextLevel } = xpProgress(doc?.xp ?? 0)
  res.json({ userId, xp: doc?.xp ?? 0, level, xpIntoLevel, xpForNextLevel })
})
