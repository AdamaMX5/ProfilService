// XP economy for the reputation/level system (see übersichtPlan.md — "Reputation: kein
// eigener Service"). Unknown event types map to 0 XP (a no-op, not an error) so a future
// caller adding a new event type never breaks against an unpatched ProfileService — matches
// the "never blocks the caller" contract WaveService/ActivationService already promise.
export const XP_PER_EVENT_TYPE: Record<string, number> = {
  checkin: 20,
  'wave.join': 10,
  'wave.share': 15,
  'wave.contribution': 25,
}

export function xpForEventType(type: string): number {
  return XP_PER_EVENT_TYPE[type] ?? 0
}

// Cumulative XP required to reach `level` (level 1 = 0 XP). Quadratic curve: the cost of
// each additional level grows by 100 XP (L2=100, L3=300, L4=600, L5=1000, ...).
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level
}

// Inverse of xpForLevel — largest level whose threshold is <= xp. Closed-form solve of
// 50*L^2 - 50*L - xp <= 0, then nudged to land exactly on an integer boundary (avoids
// floating-point edge cases right at a threshold).
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1
  let level = Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100)
  while (xpForLevel(level + 1) <= xp) level += 1
  while (xpForLevel(level) > xp) level -= 1
  return level
}

export interface XpProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export function xpProgress(xp: number): XpProgress {
  const level = levelForXp(xp)
  const xpIntoLevel = xp - xpForLevel(level)
  const xpForNextLevel = xpForLevel(level + 1) - xpForLevel(level)
  return { level, xpIntoLevel, xpForNextLevel }
}
