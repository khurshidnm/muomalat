import { REL } from '../../fields/relations'
import type { Save } from './save'
import { type Doc, idOf, idsOf, isolated } from './shared'

/**
 * Stories that need the editor-in-chief (CMS-SPEC §5.5): legal review,
 * a single anonymous source, sponsorship, legal sensitivity, or an author's
 * declared interest in an institution the story is about or mentions
 * (ART-31 escalates).
 */
export async function requiresEic(s: Save): Promise<boolean> {
  const m = s.merged
  if (m.needsLegal && m.needsLegal !== 'na') return true
  if (m.singleAnonymousSource) return true
  if (s.sponsored()) return true
  if (m.legallySensitive) return true
  return (await declaredInterestConflicts(s)).length > 0
}

/** Institutions in `about`/`mentions` that an author has declared an interest in. */
export async function declaredInterestConflicts(s: Save): Promise<string[]> {
  const institutions = new Set([idOf(s.merged.about), ...idsOf(s.merged.mentions)].filter((x) => x !== undefined).map(String))
  if (!institutions.size) return []
  const users = await s.authorUsers()
  if (!users.length) return []
  const { docs } = await s.req.payload.find({
    collection: REL.users,
    where: { id: { in: users } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req: isolated(s.req),
  })
  const hits = new Set<string>()
  for (const u of docs as unknown as Doc[]) {
    for (const i of (u.declaredInterests as Doc[] | undefined) ?? []) {
      const id = idOf(i.institution)
      if (id !== undefined && institutions.has(String(id))) hits.add(String(id))
    }
  }
  return [...hits]
}

/**
 * "If the editor-in-chief is the author, another editor publishes it, and the
 * editor-in-chief's own sign-off is recorded as legalSignOff" (§5.5). Never
 * for sponsored stories: those are published by the editor-in-chief only (SP-6).
 */
export async function eicAuthorException(s: Save): Promise<boolean> {
  if (s.sponsored()) return false
  const signedBy = idOf(((s.merged.legalSignOff ?? {}) as Doc).by)
  if (signedBy === undefined) return false
  if (!(await s.isAuthor(signedBy))) return false
  const signer = (await s.req.payload.findByID({
    collection: REL.users,
    id: signedBy,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req: isolated(s.req),
  })) as Doc | null
  return signer?.role === 'eic'
}
