import { describe, expect, it } from 'vitest'

import { canonicalJSON, hashRow, ipNetwork } from '@/payload/audit/hash'
import { signV4 } from '@/payload/audit/export'
import { tashkentDay, tashkentDayStart, tashkentTime } from '@/payload/audit/time'
import { diffDocs } from '@/payload/hooks/audit/diff'
import type { FlattenedField } from 'payload'

describe('audit hashing (unit)', () => {
  it('canonical JSON sorts keys at every level and drops undefined', () => {
    expect(canonicalJSON({ b: 1, a: { d: [1, { z: 1, y: undefined, x: null }], c: 'é' } })).toBe('{"a":{"c":"é","d":[1,{"x":null,"z":1}]},"b":1}')
  })

  it('treats empty strings as null, normalises dates, and hashes the IP as its network', () => {
    const base = { action: 'doc.update', at: '2026-10-09T10:00:00.000Z', prevHash: 'abc', ip: '203.0.113.7' }
    const h = hashRow(base)
    expect(hashRow({ ...base, summary: '' })).toBe(h)
    expect(hashRow({ ...base, at: new Date('2026-10-09T10:00:00Z') })).toBe(h)
    expect(hashRow({ ...base, ip: '203.0.113.0/24' })).toBe(h)
    expect(hashRow({ ...base, ip: '203.0.114.7' })).not.toBe(h)
    expect(hashRow({ ...base, prevHash: 'abd' })).not.toBe(h)
  })

  it('reduces addresses to the network Postgres prints for set_masklen(…, 24|48)', () => {
    expect(ipNetwork('203.0.113.7')).toBe('203.0.113.0/24')
    expect(ipNetwork('203.0.113.0/24')).toBe('203.0.113.0/24')
    expect(ipNetwork('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1::/48')
    expect(ipNetwork('2001:0db8:0001::1')).toBe('2001:db8:1::/48')
    expect(ipNetwork('2001:db8:1::/48')).toBe('2001:db8:1::/48')
    expect(ipNetwork('2001::1')).toBe('2001::/48')
    expect(ipNetwork('::ffff:203.0.113.7')).toBe('::/48')
    expect(ipNetwork('local')).toBe('local')
    expect(ipNetwork('')).toBeNull()
  })
})

describe('Tashkent time (unit)', () => {
  it('days and times are UTC+05:00', () => {
    expect(tashkentDay('2026-10-08T19:00:00Z')).toBe('2026-10-09')
    expect(tashkentDay('2026-10-08T18:59:59Z')).toBe('2026-10-08')
    expect(tashkentTime('2026-10-09T04:00:00Z')).toBe('09:00')
    expect(tashkentDayStart('2026-10-09').toISOString()).toBe('2026-10-08T19:00:00.000Z')
  })
})

describe('SigV4 (unit)', () => {
  it('matches the AWS documentation example (GET Object)', () => {
    const headers = signV4({
      method: 'GET',
      url: 'https://examplebucket.s3.amazonaws.com/test.txt',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      headers: { Range: 'bytes=0-9' },
      payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      now: new Date('2013-05-24T00:00:00Z'),
    })
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    )
  })
})

describe('field-path diff (unit)', () => {
  const fields = [
    { name: 'title', type: 'text' },
    { name: 'rubric', type: 'relationship', relationTo: 'rubrics' },
    { name: 'when', type: 'date' },
    {
      name: 'sponsored',
      type: 'group',
      flattenedFields: [
        { name: 'partner', type: 'text' },
        { name: 'enabled', type: 'checkbox' },
      ],
    },
    {
      name: 'sources',
      type: 'array',
      flattenedFields: [
        { name: 'title', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
    { name: 'body', type: 'richText' },
  ] as unknown as FlattenedField[]

  it('lists changed paths, normalising relationships, dates and empties', () => {
    const before = { title: 'A', rubric: 3, when: '2026-10-09T10:00:00.000Z', sponsored: { partner: '', enabled: false }, sources: [{ id: 'x', title: 'S', url: 'https://a' }], body: { root: { children: [] } } }
    const after = {
      title: 'B',
      rubric: { id: 3, name: 'populated' },
      when: '2026-10-09T15:00:00+05:00',
      sponsored: { partner: null, enabled: true },
      sources: [{ id: 'x', title: 'S', url: 'https://b' }, { id: 'y', title: 'T', url: null }],
      body: { root: { children: [{ type: 'paragraph' }] } },
    }
    const diff = diffDocs(fields, before, after, { slug: 'articles' })
    expect(diff.paths).toEqual(['title', 'sponsored.enabled', 'sources.0.url', 'sources.1', 'body'])
    // Articles keep sponsorship values (the Art. 15 record); content values are never stored.
    expect(diff.after).toEqual({ 'sponsored.enabled': true })
  })

  it('reports a removed or reordered row as the array', () => {
    const before = { sources: [{ id: 'x', title: 'S' }, { id: 'y', title: 'T' }] }
    expect(diffDocs(fields, before, { sources: [{ id: 'y', title: 'T' }] }, { slug: 'tags' }).paths).toEqual(['sources'])
    expect(diffDocs(fields, before, { sources: [{ id: 'y', title: 'T' }, { id: 'x', title: 'S' }] }, { slug: 'tags' }).paths).toEqual(['sources'])
  })

  it('skips fields the caller was not given, and stores no values for personal data', () => {
    const diff = diffDocs(fields, { title: 'A', sponsored: { partner: 'P' } }, { title: 'B' }, { slug: 'contact-messages' })
    expect(diff.paths).toEqual(['title'])
    expect(diff.before).toEqual({})
    expect(diff.after).toEqual({})
  })
})
