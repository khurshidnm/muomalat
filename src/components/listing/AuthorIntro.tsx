import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { commonMessages } from '@/i18n/messages/common'
import { listingMessages } from '@/i18n/messages/listing'
import type { Author, Localized } from '@/content'
import { href, paths } from '@/lib/routes'
import { Icon } from '@/components/ui/Icon'
import { SponsoredLabel } from '@/components/ui/Labels'
import { Placeholder } from '@/components/ui/Placeholder'

/** Bylines that belong to a team rather than a person. */
export const NEWSROOM_BYLINE = 'tahririyat'
export const COMMERCIAL_BYLINE = 'hamkorlik'

export function isOrganisationByline(slug: string): boolean {
  return slug === NEWSROOM_BYLINE || slug === COMMERCIAL_BYLINE
}

/**
 * Author page details under the name: bio, contacts and a status note.
 * Personal profiles are samples until the roster is confirmed, so the e-mail
 * and a sample note render as placeholders. The newsroom byline explains it
 * is shared; the commercial byline says plainly that it is not the newsroom.
 */
export function AuthorIntro({ author: a, locale }: { author: Localized<Author>; locale: Locale }) {
  const t = pick(commonMessages, locale)
  const m = pick(listingMessages, locale)
  return (
    <div className="mt-4 space-y-4">
      <p lang={a.contentLang} className="max-w-[60ch] font-serif text-lead leading-relaxed text-ink">
        {a.bio}
      </p>

      {a.email || a.telegram ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-meta">
          {a.email ? (
            <div className="flex items-center gap-2">
              <dt className="inline-flex items-center gap-1.5 text-ink-3">
                <Icon name="mail" size={16} />
                {m.author.email}
              </dt>
              <dd>
                <Placeholder>
                  <a href={`mailto:${a.email}`} className="text-link break-all">
                    {a.email}
                  </a>
                </Placeholder>
              </dd>
            </div>
          ) : null}
          {a.telegram ? (
            <div className="flex items-center gap-2">
              <dt className="inline-flex items-center gap-1.5 text-ink-3">
                <Icon name="telegram" size={16} />
                {m.author.telegram}
              </dt>
              <dd>
                <a
                  href={`https://t.me/${a.telegram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {a.telegram}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {a.slug === COMMERCIAL_BYLINE ? (
        <aside aria-label={t.labels.sponsored} className="border border-brass bg-brass-wash p-4">
          <SponsoredLabel>{t.labels.sponsored}</SponsoredLabel>
          <p className="mt-2.5 text-ui text-ink">{m.author.commercialNote(t.labels.sponsored)}</p>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-meta font-medium">
            <Link href={href(locale, paths.advertise())} className="text-link">
              {m.author.advertiseLink}
            </Link>
            <Link href={href(locale, paths.policy())} className="text-link">
              {m.author.policyLink}
            </Link>
          </p>
        </aside>
      ) : a.slug === NEWSROOM_BYLINE ? (
        <p className="flex items-start gap-2 text-meta leading-relaxed text-ink-2">
          <Icon name="users" size={16} className="mt-0.5 shrink-0 text-emerald" />
          <span>
            {m.author.newsroomNote}{' '}
            <Link href={href(locale, paths.policy())} className="text-link whitespace-nowrap">
              {m.author.policyLink}
            </Link>
          </span>
        </p>
      ) : (
        <p className="text-meta leading-relaxed text-ink-3">
          <Placeholder>{m.author.sample}</Placeholder>
        </p>
      )}
    </div>
  )
}
