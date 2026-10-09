import type { RubricSlug } from '@/content'
import { paths } from '@/lib/routes'

/** Stories per listing page. Page 1 lives at /{rubric}, later pages at /{rubric}/sahifa/{n}. */
export const PAGE_SIZE = 12

export function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

export function pageSlice<T>(list: T[], page: number): T[] {
  return list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

/** Locale-free path of a rubric listing page. */
export function rubricPagePath(rubric: RubricSlug, page: number): string {
  return page <= 1 ? paths.rubric(rubric) : `${paths.rubric(rubric)}/sahifa/${page}`
}

/** Parses the [page] segment: only canonical integers ≥ 2 ("2", not "02" or "1"). */
export function parsePage(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined
  const n = Number(value)
  return n >= 2 ? n : undefined
}
