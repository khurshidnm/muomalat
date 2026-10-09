'use client'

import { CONTACT_FORM_ID, TOPIC_EVENT, TOPIC_PARAM, type ContactTopic } from './options'

/**
 * Link that opens the contact form with a topic preselected. Without JS it is
 * a plain link to ?mavzu=…#xabar (the form reads the parameter on load); with
 * JS it stays on the page, selects the topic and moves focus to the select.
 */
export function TopicLink({
  href,
  topic,
  className = '',
  children,
}: {
  /** Localised /aloqa path. */
  href: string
  topic: ContactTopic
  className?: string
  children: React.ReactNode
}) {
  const target = `${href}?${TOPIC_PARAM}=${topic}#${CONTACT_FORM_ID}`
  return (
    <a
      href={target}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        if (!document.getElementById(CONTACT_FORM_ID)) return
        e.preventDefault()
        window.dispatchEvent(new CustomEvent<ContactTopic>(TOPIC_EVENT, { detail: topic }))
      }}
    >
      {children}
    </a>
  )
}
