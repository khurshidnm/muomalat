import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { isRubric } from '@/content'
import { RubricListing, rubricMetadata, rubricPageExists, rubricPageParams } from '@/components/listing/RubricListing'
import { parsePage } from '@/components/listing/paginate'

type Params = { params: Promise<{ lang: string; rubric: string; page: string }> }

/** Pages 2…n of a rubric (page 1 is /{rubric}); only pages that have stories are built. */
export const dynamicParams = false

export function generateStaticParams() {
  return rubricPageParams()
}

function load(lang: string, rubric: string, page: string) {
  if (!isLocale(lang) || !isRubric(rubric)) return undefined
  const n = parsePage(page)
  if (!n || !rubricPageExists(lang, rubric, n)) return undefined
  return { locale: lang, rubric, page: n }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, rubric, page } = await params
  const p = load(lang, rubric, page)
  if (!p) return {}
  return rubricMetadata(p.locale, p.rubric, p.page)
}

export default async function RubricArchivePage({ params }: Params) {
  const { lang, rubric, page } = await params
  const p = load(lang, rubric, page)
  if (!p) notFound()
  return <RubricListing locale={p.locale} rubric={p.rubric} page={p.page} />
}
