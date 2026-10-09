import { notFound } from 'next/navigation'

/**
 * Any deeper path that no other route claims (/foo/bar/baz, /ru/x/y/z) lands
 * here and throws notFound(), so the localized [lang]/not-found.tsx renders
 * inside the site chrome with a 404 status. Static and dynamic routes at the
 * same depth always win over this catch-all, and a dynamic route that rejects
 * its params (dynamicParams = false) falls through to it as well.
 *
 * No generateStaticParams: there is nothing to prerender, every match is a 404.
 */
export default function UnmatchedPath(): never {
  notFound()
}
