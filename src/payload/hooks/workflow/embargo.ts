import type { Save } from './save'
import { type Doc, fieldError, isBlank, isoOrNull, MINUTE, time, wctx } from './shared'

/**
 * Embargo (CMS-SPEC §5.10). While an embargo is active (`indefinite`, or
 * `until` in the future) the story cannot be published, scheduled before
 * `until`, posted to Telegram or put in the newsletter. Reporters not on the
 * story cannot read it (articlesRead). The publish refusal itself is in the
 * two-person rule; this module checks the fields.
 */

/** Active embargo on a document (Telegram and the digest call this too). */
export function embargoActive(doc: Doc | null | undefined, now = Date.now()): boolean {
  const e = (doc?.embargo ?? {}) as Doc
  if (e.indefinite) return true
  const until = time(e.until)
  return until !== undefined && until > now
}

/** "EMBARGO 14:00 (09:00 UTC)" — the badge text, shared by the admin components. */
export function embargoLabel(doc: Doc | null | undefined): string | undefined {
  const e = (doc?.embargo ?? {}) as Doc
  if (e.indefinite) return 'EMBARGO (muddatsiz)'
  const until = time(e.until)
  if (until === undefined || until <= Date.now()) return undefined
  const fmt = (tz: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(until)
  const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Tashkent' }).format(until).replace('/', '.')
  return `EMBARGO ${day} ${fmt('Asia/Tashkent')} (${fmt('UTC')} UTC)`
}

const isTashkentMidnight = (t: number) => {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Tashkent' }).format(t)
  return parts === '00:00'
}

export async function embargoRules(s: Save): Promise<void> {
  const next = (s.merged.embargo ?? {}) as Doc
  const prev = (s.original.embargo ?? {}) as Doc
  const errors: { path: string; message: string }[] = []
  const until = time(next.until)
  const untilChanged = isoOrNull(next.until) !== isoOrNull(prev.until)
  const indefiniteChanged = Boolean(next.indefinite) !== Boolean(prev.indefinite)
  const set = until !== undefined || Boolean(next.indefinite)

  if (until !== undefined && next.indefinite) {
    errors.push({ path: 'embargo.indefinite', message: 'Embargo: tugash vaqti va «Muddatsiz» birga belgilanmaydi.' })
  }
  if (untilChanged && until !== undefined && until <= s.now) {
    errors.push({ path: 'embargo.until', message: 'Embargo tugash vaqti kelajakda boʻlishi kerak.' })
  }
  if (set && isBlank(next.source)) {
    errors.push({ path: 'embargo.source', message: 'Embargo manbasini yozing: embargoni kim qoʻygan.' })
  }
  if (set && (untilChanged || (indefiniteChanged && next.indefinite)) && (s.original.firstPublishedAt || (await s.mainPublished()))) {
    errors.push({ path: 'embargo.until', message: 'Chop etilgan maqolaga embargo qoʻyilmaydi.' })
  }

  // A schedule edited by hand must still respect the embargo and the 1-minute lead (§5.2).
  if (s.state === 'scheduled' && !s.transition && isoOrNull(s.merged.scheduledAt) !== isoOrNull(s.original.scheduledAt)) {
    const at = time(s.merged.scheduledAt)
    if (at === undefined || at < s.now + MINUTE) {
      errors.push({ path: 'scheduledAt', message: 'Rejalashtirilgan vaqt kamida 1 daqiqa keyin boʻlishi kerak; rejani bekor qilish uchun «Rejani bekor qilish» tugmasidan foydalaning.' })
    } else if (next.indefinite || (until !== undefined && at < until)) {
      errors.push({ path: 'scheduledAt', message: 'Rejalashtirilgan vaqt embargo tugashidan oldin boʻlmasligi kerak.' })
    }
  }
  if (errors.length) throw fieldError(s.req, errors)

  if (untilChanged && until !== undefined && isTashkentMidnight(until)) {
    ;(wctx(s.req).workflowWarnings ??= []).push({
      rule: 'EMB-1',
      path: 'embargo.until',
      message: '«Yarim tun» noaniq: 00:00 oʻrniga 00:01 ni tanlang.',
    })
  }
}
