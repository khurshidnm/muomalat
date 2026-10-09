import type { Payload, TypedUser } from 'payload'

/**
 * Dashboard widget (CMS-SPEC §5.4): published stories whose second read is
 * still open, overdue ones first. Mounted as `admin.components.beforeDashboard`.
 * Only the desk sees it (the second read is an editor's job), and the list
 * is read with the viewer's own access.
 */
export async function SecondReads({ payload, user }: { payload: Payload; user?: TypedUser | null }) {
  const role = (user as { role?: string; active?: boolean } | null | undefined)?.role
  if (!user || (user as { active?: boolean }).active === false || (role !== 'editor' && role !== 'eic')) return null
  const { docs } = await payload.find({
    collection: 'articles',
    where: { and: [{ 'secondRead.required': { equals: true } }, { 'secondRead.doneAt': { exists: false } }] },
    draft: true,
    depth: 0,
    limit: 20,
    sort: 'secondRead.dueAt',
    user,
    overrideAccess: false,
    select: { title: true, secondRead: true } as never,
  })
  if (!docs.length) return null
  const now = Date.now()
  const fmt = (iso: string) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date(iso))
        .map((x) => [x.type, x.value]),
    )
    return `${p.day}.${p.month} ${p.hour}:${p.minute}`
  }
  return (
    <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 4, padding: 12, marginBottom: 24 }}>
      <strong>Ikkinchi oʻqish kutilmoqda</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
        {(docs as unknown as { id: number; title?: string; secondRead?: { dueAt?: string } }[]).map((d) => {
          const due = d.secondRead?.dueAt
          const overdue = due ? new Date(due).getTime() < now : false
          return (
            <li key={d.id} style={{ color: overdue ? 'var(--theme-error-500)' : undefined }}>
              <a href={`/admin/collections/articles/${d.id}`}>{d.title || `#${d.id}`}</a>
              {due ? ` — ${overdue ? 'muddati oʻtgan' : 'muddat'}: ${fmt(due)} (Toshkent)` : ''}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default SecondReads
