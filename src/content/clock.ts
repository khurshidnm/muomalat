/**
 * Which content source is in use, and the content clock. Kept apart from
 * ./index.ts so the adapters can use them without importing the public API.
 */
import { CONTENT_NOW } from './shared'
import { tashkentIso } from './dates'

export type ContentSource = 'payload' | 'mock'

/** Where content comes from: `mock` only when CONTENT_SOURCE says so. */
export function contentSource(): ContentSource {
  return process.env.CONTENT_SOURCE === 'mock' ? 'mock' : 'payload'
}

/**
 * The content clock: relative dates ("Kecha, 18:10"), meeting status and the
 * "as of" lines. The mock data was written against a fixed newsroom time;
 * CMS content uses the time of the render.
 */
export function contentNow(): string {
  return contentSource() === 'mock' ? CONTENT_NOW : tashkentIso(new Date())
}
