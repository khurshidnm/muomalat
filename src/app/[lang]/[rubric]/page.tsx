import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { isRubric } from '@/content'
import { RubricListing, rubricMetadata, rubricParams } from '@/components/listing/RubricListing'

type Params = { params: Promise<{ lang: string; rubric: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return rubricParams()
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, rubric } = await params
  if (!isLocale(lang) || !isRubric(rubric)) return {}
  return rubricMetadata(lang, rubric, 1)
}

export default async function RubricPage({ params }: Params) {
  const { lang, rubric } = await params
  if (!isLocale(lang) || !isRubric(rubric)) notFound()
  return <RubricListing locale={lang} rubric={rubric} page={1} />
}
