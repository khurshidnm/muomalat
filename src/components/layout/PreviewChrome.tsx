import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { articleMessages } from '@/i18n/messages/article'
import { isPreview } from '@/content'
import { PreviewRefresh } from './PreviewRefresh'

/**
 * What a draft preview adds to every page (CMS-SPEC §5.13): a fixed
 * "KOʻRIB CHIQISH — chop etilmagan" banner with a way out, `robots: noindex`
 * (React hoists the meta into the head), and the live-preview refresh. Draft
 * mode exists only on the CMS host for a signed-in staff member; anywhere
 * else this renders nothing.
 */
export async function previewChrome(locale: Locale): Promise<React.ReactNode | undefined> {
  if (!(await isPreview())) return undefined
  const m = pick(articleMessages, locale)
  const cms = process.env.CMS_URL || 'http://cms.localhost:3000'
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <PreviewRefresh serverURL={cms} />
      <div role="status" className="no-print fixed inset-x-0 bottom-0 z-50 border-t-2 border-signal bg-ink text-paper">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <p className="label-caps text-paper">{m.preview}</p>
          <form action="/exit-preview" method="get">
            <button type="submit" className="text-meta font-semibold text-paper underline underline-offset-2 hover:no-underline">
              {m.previewExit}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
