import { Router } from 'express'
import { Profile } from '../models/Profile.js'
import { applyPrivacy } from '../lib/privacy.js'

export const profileRouter = Router()

// GET /profile/:userId — list all prefixes for a user.
// Whole-profile-private entries are omitted for foreign callers.
profileRouter.get('/:userId', async (req, res) => {
  const { userId } = req.params
  const isOwner = req.user?.userId === userId
  const profiles = await Profile.find({ userId }, 'prefix data')
  const prefixes = profiles
    .filter((p) => !applyPrivacy(p.data as Record<string, unknown>, isOwner).hidden)
    .map((p) => p.prefix)
  res.json({ userId, prefixes })
})

// GET /profile/:userId/:prefix — get a single profile, privacy applied.
profileRouter.get('/:userId/:prefix', async (req, res) => {
  const { userId, prefix } = req.params
  const profile = await Profile.findOne({ userId, prefix })
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' })
    return
  }

  const isOwner = req.user?.userId === userId
  const { hidden, data } = applyPrivacy(profile.data as Record<string, unknown>, isOwner)
  if (hidden) {
    // Do not leak the existence of an owner-only profile to foreign callers.
    res.status(404).json({ error: 'Profile not found' })
    return
  }

  res.json({ userId: profile.userId, prefix: profile.prefix, profile: data })
})

// POST /profile — body: { userId, prefix, profile: { ... } }
profileRouter.post('/', async (req, res) => {
  const { userId, prefix, profile } = req.body as {
    userId?: string
    prefix?: string
    profile?: Record<string, unknown>
  }

  if (!userId || !prefix || !profile) {
    res.status(400).json({ error: 'userId, prefix and profile are required' })
    return
  }

  const updated = await Profile.findOneAndUpdate(
    { userId, prefix },
    { $set: { data: profile } },
    { upsert: true, new: true }
  )
  res.status(200).json({ userId: updated.userId, prefix: updated.prefix, profile: updated.data })
})
