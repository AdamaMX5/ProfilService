import { describe, it, expect } from 'vitest'
import { xpForLevel, levelForXp, xpProgress, xpForEventType } from '../src/lib/leveling.js'

describe('leveling', () => {
  it('computes cumulative thresholds on the documented quadratic curve', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(100)
    expect(xpForLevel(3)).toBe(300)
    expect(xpForLevel(4)).toBe(600)
    expect(xpForLevel(5)).toBe(1000)
  })

  it('never returns a level below 1, even for negative or zero xp', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(-5)).toBe(1)
  })

  it('lands exactly on threshold boundaries', () => {
    expect(levelForXp(99)).toBe(1)
    expect(levelForXp(100)).toBe(2)
    expect(levelForXp(299)).toBe(2)
    expect(levelForXp(300)).toBe(3)
  })

  it('round-trips levelForXp/xpForLevel across a wide range', () => {
    for (let level = 1; level <= 200; level += 1) {
      const threshold = xpForLevel(level)
      expect(levelForXp(threshold)).toBe(level)
      // The next level's threshold is always >1 xp away (min step is 100), so +1 xp stays put.
      expect(levelForXp(threshold + 1)).toBe(level)
    }
  })

  it('derives progress-into-level and xp-for-next-level consistently', () => {
    expect(xpProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100 })
    expect(xpProgress(45)).toEqual({ level: 1, xpIntoLevel: 45, xpForNextLevel: 100 })
    expect(xpProgress(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 200 })
    expect(xpProgress(250)).toEqual({ level: 2, xpIntoLevel: 150, xpForNextLevel: 200 })
  })

  it('maps known event types to their documented xp values and unknown types to 0', () => {
    expect(xpForEventType('checkin')).toBe(20)
    expect(xpForEventType('wave.join')).toBe(10)
    expect(xpForEventType('wave.share')).toBe(15)
    expect(xpForEventType('wave.contribution')).toBe(25)
    expect(xpForEventType('something-unrecognized')).toBe(0)
  })
})
