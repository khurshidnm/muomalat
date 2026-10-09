import Image from 'next/image'
import type { ImageRef } from '@/content/types'

/**
 * Editorial image with caption and credit. Uses next/image for sizing and lazy
 * loading; SVG placeholders bypass the optimiser, CMS rasters go through it.
 */
export function Figure({
  image,
  sizes = '(min-width: 1024px) 720px, 100vw',
  preload = false,
  priority = false,
  ratio,
  showCaption = true,
  lang,
  className = '',
  imgClassName = '',
}: {
  image: ImageRef
  sizes?: string
  /** Above-the-fold hero: preload the image (next/image `preload`). */
  preload?: boolean
  /** @deprecated Next 16 renamed it; use `preload`. */
  priority?: boolean
  /** Force an aspect ratio (e.g. "3/2"); defaults to the image's own. */
  ratio?: string
  showCaption?: boolean
  /** Language of the alt text and caption when it differs from the page's. */
  lang?: string
  className?: string
  imgClassName?: string
}) {
  const unoptimized = image.src.endsWith('.svg')
  const caption = showCaption && (image.caption || image.credit)
  return (
    <figure className={className} lang={lang}>
      <div className="relative overflow-hidden bg-paper-2" style={{ aspectRatio: ratio ?? `${image.width}/${image.height}` }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={preload || priority}
          unoptimized={unoptimized}
          className={`object-cover ${imgClassName}`}
        />
      </div>
      {caption ? (
        <figcaption className="mt-2 font-sans text-meta text-ink-3">
          {image.caption ? <span className="text-ink-2">{image.caption}</span> : null}
          {image.caption && image.credit ? ' ' : null}
          {image.credit ? <span className="whitespace-nowrap">{image.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  )
}

/** Image without caption, for story lists. */
export function Thumb({
  image,
  sizes,
  ratio = '3/2',
  preload,
  priority,
  className = '',
}: {
  image: ImageRef
  sizes: string
  ratio?: string
  preload?: boolean
  /** @deprecated use `preload`. */
  priority?: boolean
  className?: string
}) {
  return <Figure image={image} sizes={sizes} ratio={ratio} preload={preload || priority} showCaption={false} className={className} />
}
