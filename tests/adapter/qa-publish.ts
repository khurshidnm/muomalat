/**
 * Publication freshness check on a scratch database (development only): the
 * worker's part of CMS-SPEC §8.4 done by hand. Publishes a new story through
 * the Local API (outside a request, so its invalidation waits in the outbox),
 * then posts the outbox row's targets, signed, to /internal/revalidate of the
 * app at APP_URL, as the worker would.
 *
 *   DATABASE_URL=… APP_URL=http://127.0.0.1:3107 npx tsx --env-file=.env tests/adapter/qa-publish.ts <slug> [create|retitle|withdraw]
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { parseTargets } from '@/payload/delivery/tags'
import { signedRequest } from '@/payload/delivery/signature'

if (/\/muomalat(\?|$)/.test(process.env.DATABASE_URL ?? '')) throw new Error('Refusing to write to the dev database "muomalat".')
const slug = process.argv[2]
const action = process.argv[3] ?? 'create'
if (!slug || !['create', 'retitle', 'withdraw'].includes(action)) throw new Error('usage: qa-publish.ts <slug> [create|retitle|withdraw]')
const app = process.env.APP_URL || 'http://127.0.0.1:3000'

const payload = await getPayload({ config })
const one = async (collection: 'rubrics' | 'authors' | 'tags', where: Record<string, unknown>) =>
  (await payload.find({ collection, where: where as never, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
const context = { trustedInternal: true, importing: true }
const existing = (await payload.find({ collection: 'articles', where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
const story =
  action === 'create'
    ? await payload.create({
        collection: 'articles',
        depth: 0,
        overrideAccess: true,
        context,
        data: {
          title: `QA yangi maqola ${slug}`,
          slug,
          lead: 'Bank regulyatori yangi hisobot eʼlon qildi.',
          body: {
            root: {
              type: 'root', version: 1, direction: 'ltr', format: '', indent: 0,
              children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '', children: [{ type: 'text', version: 1, text: 'Hisobotda islom moliyasi xizmatlari haqida maʼlumot berilgan.', format: 0, style: '', mode: 'normal', detail: 0 }] }],
            },
          },
          rubric: await one('rubrics', { slug: { equals: 'yangiliklar' } }),
          authors: [await one('authors', { slug: { equals: 'malika-yusupova' } })],
          tags: [await one('tags', { slug: { equals: 'regulyator' } })],
          sources: [{ title: 'Hisobot', publisher: 'Bank regulyatori' }],
          workflowStatus: 'published',
          publishedAt: new Date().toISOString(),
          firstPublishedAt: new Date().toISOString(),
          _status: 'published',
        } as never,
      })
    : await payload.update({
        collection: 'articles',
        id: existing!.id,
        depth: 0,
        overrideAccess: true,
        context,
        data: (action === 'retitle'
          ? { title: `QA yangi sarlavha ${slug}`, _status: 'published' }
          : { workflowStatus: 'withdrawn', noindex: true, withdrawal: { at: new Date().toISOString(), publicNotice: 'Material tahririyat qarori bilan olib tashlandi.' }, _status: 'published' }) as never,
      })
const { docs } = await payload.find({
  collection: 'publish-events',
  where: { and: [{ collection: { equals: 'articles' } }, { docId: { equals: String(story.id) } }] },
  sort: '-id',
  limit: 1,
  depth: 0,
  overrideAccess: true,
})
const targets = parseTargets(docs[0]?.targets)
if (!targets) throw new Error('no outbox row for the story')
const { body, headers } = signedRequest(targets, process.env.INTERNAL_REVALIDATE_SECRET!)
const res = await fetch(`${app}/internal/revalidate`, { method: 'POST', body, headers })
console.log('story', story.id, slug, 'revalidate', res.status, await res.text())
process.exit(0)
