import { afterAll, describe, expect, it, vi } from 'vitest'

import { testPayload } from '../helpers/payload'
import { form, fromPage, uniqueEmail } from './helpers'

vi.mock('next/headers', async () => {
  const { request } = await import('./helpers')
  return { headers: async () => request.headers }
})

const { subscribeDigest } = await import('@/app/actions')

/** Development only: the real SMTP adapter delivers to Mailpit (docker/compose.dev.yml). */
const MAILPIT = 'http://localhost:8025'
const mailpitUp = await fetch(`${MAILPIT}/api/v1/info`)
  .then((r) => r.ok)
  .catch(() => false)

afterAll(async () => (await testPayload()).destroy())

describe('confirmation mail through payload.sendEmail', () => {
  it.skipIf(!mailpitUp || !process.env.SMTP_HOST)('arrives in Mailpit with a working confirmation link', async () => {
    fromPage('/en/dayjest')
    const email = uniqueEmail('mailpit')
    await subscribeDigest({ status: 'idle', errors: {}, values: {} }, form({ email }))
    let message: { Subject: string; Text: string; HTML: string } | undefined
    for (let i = 0; i < 20 && !message; i++) {
      const found = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json()) as {
        messages: { ID: string }[]
      }
      if (found.messages.length) message = await (await fetch(`${MAILPIT}/api/v1/message/${found.messages[0].ID}`)).json()
      else await new Promise((r) => setTimeout(r, 250))
    }
    expect(message?.Subject).toBe('Confirm your Muomalat digest subscription')
    expect(message?.Text).toMatch(/\/en\/dayjest\/tasdiqlash\?t=[\w-]{43}/)
    expect(message?.HTML).toContain('lang="en"')
  })
})
