import type { Field, FieldAccess, GlobalBeforeOperationHook, GlobalSlug, PayloadRequest } from 'payload'
import { APIError } from 'payload'

import { type Role, userRole } from '../../access/roles'
import { systemFieldAccess } from '../../access/system'
import { homeRules, labelRules, launchGate } from '../validate'
import { canonical, type Doc, forbidden, type Id, isolated, isPlainObject, wctx } from './shared'

/**
 * Global version restore (CMS-SPEC §3.16, PHASE0 item 12). Payload's
 * `restoreGlobalVersion` runs no beforeValidate or beforeChange hook and no
 * field validation or field access: it writes the stored version into the
 * main row and republishes at once (with `?draft=true` it unpublishes). This
 * beforeOperation guard therefore
 * - limits restore to the roles that may publish that global;
 * - refuses a restore that would change a field the user may not write
 *   (site-settings groups belong to different roles);
 * - re-runs HOME-1, HOME-2, SP-7 and SET-1 against the version being restored.
 * The audit concern records a permitted restore (`doc.version_restore`).
 */

const RESTORERS: Record<string, Role[]> = {
  'home-page': ['editor', 'eic'],
  navigation: ['eic', 'admin'],
  'ad-slots': ['commercial'],
  'site-settings': ['eic', 'admin'],
  'editorial-rules': ['eic'],
}

const differs = (a: unknown, b: unknown) => canonical(a ?? null) !== canonical(b ?? null)

/** Paths the user may not write whose value the restore would change. */
async function forbiddenChanges(req: PayloadRequest, fields: Field[], restored: Doc, current: Doc, data: Doc, prefix = ''): Promise<string[]> {
  const out: string[] = []
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        if ('name' in tab && tab.name) {
          out.push(...(await forbiddenChanges(req, tab.fields, (restored[tab.name] ?? {}) as Doc, (current[tab.name] ?? {}) as Doc, data, `${prefix}${tab.name}.`)))
        } else out.push(...(await forbiddenChanges(req, tab.fields, restored, current, data, prefix)))
      }
      continue
    }
    if (field.type === 'row' || field.type === 'collapsible') {
      out.push(...(await forbiddenChanges(req, field.fields, restored, current, data, prefix)))
      continue
    }
    if (!('name' in field) || field.type === 'ui' || field.type === 'join') continue
    const path = `${prefix}${field.name}`
    const r = restored[field.name]
    const c = current[field.name]
    const update = (field as { access?: { update?: FieldAccess } }).access?.update
    // System fields (written by hooks only) follow the version they belong to.
    if (update === systemFieldAccess.update || (field as { admin?: { readOnly?: boolean } }).admin?.readOnly) continue
    if (!differs(r, c)) continue
    if (update && !(await update({ req, data, doc: current, siblingData: restored } as never))) {
      out.push(path)
      continue
    }
    if (field.type === 'group' && isPlainObject(r)) {
      out.push(...(await forbiddenChanges(req, field.fields, r, isPlainObject(c) ? c : {}, data, `${path}.`)))
    }
  }
  return out
}

export const globalRestoreGuard: GlobalBeforeOperationHook = async ({ args, global, operation, req }) => {
  if (operation !== 'restoreVersion') return args
  const ctx = wctx(req)
  if (ctx.importing) return args
  const a = (args ?? {}) as { id?: Id; draft?: boolean; overrideAccess?: boolean }
  const slug = global.slug
  if (req.user) {
    const role = userRole(req)
    if (!role || !(RESTORERS[slug] ?? []).includes(role)) throw forbidden('Bu sozlamaning versiyasini tiklashga ruxsatingiz yoʻq.')
  }
  if (a.id === undefined) return args
  const version = (await req.payload.findGlobalVersionByID({
    slug: slug as GlobalSlug,
    id: a.id,
    locale: 'all',
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req: isolated(req),
  })) as unknown as { version?: Doc } | null
  const restored = version?.version
  if (!restored) return args
  const current = (await req.payload.findGlobal({ slug: slug as GlobalSlug, locale: 'all', depth: 0, overrideAccess: true, req: isolated(req) })) as unknown as Doc

  const errors: string[] = []
  if (req.user) {
    const blocked = await forbiddenChanges(req, global.fields, restored, current, restored)
    if (blocked.length) errors.push(`Bu versiya siz oʻzgartira olmaydigan maydonlarni ham qaytaradi: ${blocked.join(', ')}.`)
  }
  // The rules themselves are the validation concern's (§7.2); a restore skips its hooks, so they run here.
  const findings = [
    ...(!a.draft && slug === 'home-page' ? await homeRules(req, restored) : []),
    ...(slug === 'site-settings' ? [...launchGate(restored), ...labelRules(restored.labels, 'all')] : []),
  ]
  errors.push(...findings.filter((f) => f.level === 'error').map((f) => `${f.rule}: ${f.message}.`))
  if (errors.length) throw new APIError(errors.join(' '), 400)
  return args
}
