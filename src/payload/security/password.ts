import { createHash } from 'node:crypto'

/**
 * Password policy for staff accounts (CMS-SPEC §12.2 "Passwords", NIST SP
 * 800-63B-4):
 *
 * - at least 15 characters, counted as Unicode code points, and no
 *   composition rules (no "one digit, one symbol");
 * - not in the breached-password corpus, checked through the k-anonymity
 *   range API: only the first 5 hex characters of the SHA-1 leave the server,
 *   and the comparison of the remaining 35 happens here;
 * - if the API cannot be reached, the password is accepted and the event is
 *   logged, so an outage of a third party never blocks a password change.
 *
 * The network call is skipped when SITE_ENV=test; tests install their own
 * range lookup with setBreachedRangeLookup().
 */

export const MIN_PASSWORD_LENGTH = 15
/** Upper bound only against abuse of the hashing step; far above any passphrase. */
export const MAX_PASSWORD_LENGTH = 256

export const PASSWORD_MESSAGES = {
  tooShort: `Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat boʻlishi kerak. Bir nechta soʻzdan iborat ibora tanlang.`,
  tooLong: `Parol ${MAX_PASSWORD_LENGTH} belgidan oshmasligi kerak.`,
  breached: 'Bu parol maʼlum maʼlumotlar sizib chiqishlarida uchragan. Boshqa parol tanlang.',
} as const

/**
 * Returns the response body of `GET /range/<prefix>` (lines `SUFFIX:COUNT`),
 * or `null` when the lookup is skipped. Throws when the service is unreachable.
 */
export type RangeLookup = (prefix: string) => Promise<string | null>

const RANGE_URL = 'https://api.pwnedpasswords.com/range/'

const networkLookup: RangeLookup = async (prefix) => {
  if (process.env.SITE_ENV === 'test') return null
  const res = await fetch(RANGE_URL + prefix, {
    // Padding hides the real number of matches from anyone watching the size of the response.
    headers: { 'Add-Padding': 'true', 'User-Agent': 'muomalat-cms' },
    signal: AbortSignal.timeout(3_000),
  })
  if (!res.ok) throw new Error(`range API answered ${res.status}`)
  return res.text()
}

let lookup: RangeLookup = networkLookup

/** Tests only. `undefined` restores the network lookup. */
export function setBreachedRangeLookup(fn: RangeLookup | undefined) {
  lookup = fn ?? networkLookup
}

/** Upper-case SHA-1 hex of a password, split for the range API. */
export function rangeKey(password: string) {
  const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
  return { prefix: hash.slice(0, 5), suffix: hash.slice(5) }
}

type Logger = { warn: (obj: object | string, msg?: string) => void }

/** True when the corpus lists the password, false when not, null when the lookup was skipped or failed. */
export async function isBreached(password: string, logger?: Logger): Promise<boolean | null> {
  const { prefix, suffix } = rangeKey(password)
  let body: string | null
  try {
    body = await lookup(prefix)
  } catch (err) {
    logger?.warn({ msg: 'breached-password check unavailable; password accepted', err: (err as Error)?.message })
    return null
  }
  if (body === null) return null
  for (const line of body.split('\n')) {
    const [candidate, count] = line.trim().split(':')
    // Padding lines have a count of 0.
    if (candidate === suffix && Number(count) > 0) return true
  }
  return false
}

/** The Uzbek message for a password that breaks the policy, or null when it is acceptable. */
export async function passwordProblem(password: string, logger?: Logger): Promise<string | null> {
  const length = [...password].length
  if (length < MIN_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooShort
  if (length > MAX_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooLong
  if (await isBreached(password, logger)) return PASSWORD_MESSAGES.breached
  return null
}
