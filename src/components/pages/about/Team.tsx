import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pick } from '@/i18n/messages'
import { aboutMessages } from '@/i18n/messages/about'
import type { Author, Localized } from '@/content'
import { site } from '@/content/data/site'
import { href, paths } from '@/lib/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Placeholder } from '@/components/ui/Placeholder'
import { AboutSection } from './Section'

export interface TeamMember {
  author: Localized<Author>
  stories: number
}

/** Bylines that belong to the newsroom or the commercial team rather than a person. */
export const COLLECTIVE_BYLINES = ['tahririyat', 'hamkorlik']

/** Team: editor-in-chief (placeholder until confirmed), authors, then the shared bylines. */
export function Team({ id, locale, people, collective }: { id: string; locale: Locale; people: TeamMember[]; collective: TeamMember[] }) {
  const m = pick(aboutMessages, locale).team
  const editor = site.legal.editorInChief
  return (
    <AboutSection id={id} title={m.title} description={m.lead}>
      <h3 className="sr-only">{m.authors}</h3>
      <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
        <li className="flex gap-4 border-t border-rule py-5">
          <span aria-hidden="true" className="inline-block size-14 shrink-0 rounded-full border border-dashed border-brass bg-brass-wash/60" />
          <div className="min-w-0">
            <p className="label-caps text-brass-ink">{m.editorInChief}</p>
            <h4 className="mt-1 font-display text-h4 font-semibold">
              {editor.placeholder ? <Placeholder>{editor.value}</Placeholder> : editor.value}
            </h4>
            <p className="mt-1.5 text-meta leading-relaxed text-ink-2">{m.editorNote}</p>
          </div>
        </li>
        {people.map(({ author: a, stories }) => (
          <li key={a.slug} className="flex gap-4 border-t border-rule py-5">
            <Avatar name={a.name} size={56} />
            <div className="min-w-0">
              <h4 lang={a.contentLang} className="font-display text-h4 font-semibold">
                <Link href={href(locale, paths.author(a.slug))} className="headline-link">
                  {a.name}
                </Link>
              </h4>
              <p lang={a.contentLang} className="mt-0.5 text-meta text-ink-3">
                {a.role}
              </p>
              <p lang={a.contentLang} className="mt-2 text-meta leading-relaxed text-ink-2">
                {a.bio}
              </p>
              {stories ? <p className="figures mt-2 text-meta font-semibold text-ink-2">{m.stories(stories)}</p> : null}
            </div>
          </li>
        ))}
      </ul>

      {collective.length ? (
        <div className="mt-6 border-t-2 border-ink pt-2.5">
          <h3 className="label-caps text-ink-3">{m.bylines}</h3>
          <p className="mt-1 text-meta text-ink-3">{m.bylinesText}</p>
          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
            {collective.map(({ author: a }) => (
              <li key={a.slug} className="border-t border-rule py-4 first:border-t-0 sm:border-t-0">
                <h4 lang={a.contentLang} className="font-display text-h4 font-semibold">
                  <Link href={href(locale, paths.author(a.slug))} className="headline-link">
                    {a.name}
                  </Link>
                </h4>
                <p lang={a.contentLang} className="mt-0.5 text-meta text-ink-3">
                  {a.role}
                </p>
                <p lang={a.contentLang} className="mt-2 text-meta leading-relaxed text-ink-2">
                  {a.bio}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AboutSection>
  )
}
