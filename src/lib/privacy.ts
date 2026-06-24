/**
 * Owner-only profile visibility (issue #1).
 *
 * Profiles are free-form JSON documents. The owner can opt a profile — or
 * individual fields — out of public delivery by adding a reserved `_privacy`
 * key to the document:
 *
 *   {
 *     "publicKey": "...",                          // stays public
 *     "keyBackup": "...",                           // protected
 *     "channelKeyring": { ... },                    // protected
 *     "_privacy": {
 *       "profile": false,                           // true => whole profile owner-only
 *       "fields": ["keyBackup", "channelKeyring"]   // stripped for foreign callers
 *     }
 *   }
 *
 * Default is public: a document without a `_privacy` key is delivered in full
 * to everyone. Protection only applies once the owner opts in. The `_privacy`
 * meta key itself is never delivered to foreign callers.
 */

export const PRIVACY_KEY = '_privacy'

export interface PrivacyMeta {
  /** When true, the whole profile is only readable by its owner. */
  profile: boolean
  /** Field names that are only readable by the owner. */
  fields: string[]
}

export interface PrivacyResult {
  /** True when the whole profile is owner-only and the caller is not the owner. */
  hidden: boolean
  /** The document to deliver (privacy applied), or null when hidden. */
  data: Record<string, unknown> | null
}

function readPrivacyMeta(data: Record<string, unknown>): PrivacyMeta | null {
  const raw = data[PRIVACY_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const meta = raw as Record<string, unknown>
  const fields = Array.isArray(meta.fields)
    ? meta.fields.filter((f): f is string => typeof f === 'string')
    : []
  // Coerce to boolean so a non-boolean truthy flag (e.g. "true", 1) fails safe
  // (hides) rather than open. Only an absent/false/falsey value stays public.
  return { profile: Boolean(meta.profile), fields }
}

function stripKeys(data: Record<string, unknown>, keys: Iterable<string>): Record<string, unknown> {
  const remove = new Set(keys)
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!remove.has(key)) out[key] = value
  }
  return out
}

/**
 * Apply the owner-only visibility rules to a profile document.
 *
 * Owners (and internal callers, once authenticated as the owner) receive the
 * document untouched. Foreign callers receive it with the `_privacy` meta key
 * and any privately-flagged fields removed; if the whole profile is flagged
 * private they receive nothing (`hidden: true`).
 */
export function applyPrivacy(data: Record<string, unknown>, isOwner: boolean): PrivacyResult {
  if (isOwner) return { hidden: false, data }

  const meta = readPrivacyMeta(data)
  if (!meta) {
    // No privacy flag => public by default. Defensively strip the meta key in
    // case a malformed value is present.
    return { hidden: false, data: stripKeys(data, [PRIVACY_KEY]) }
  }

  if (meta.profile) return { hidden: true, data: null }

  return { hidden: false, data: stripKeys(data, [PRIVACY_KEY, ...meta.fields]) }
}
