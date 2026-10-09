/**
 * Allowed values for the club application form. Shared by the client form
 * and the server action (which rejects anything outside these lists).
 * Labels live in src/i18n/messages/club.ts under the same keys.
 */
export const CLUB_SECTORS = ['savdo', 'ishlab-chiqarish', 'qurilish', 'qishloq-xojaligi', 'xizmatlar', 'it', 'boshqa'] as const
export const CLUB_SIZES = ['1-10', '11-50', '51-250', '250+'] as const
export const CLUB_INTERESTS = ['murobaha', 'ijora', 'mushoraka', 'takaful', 'boshqa'] as const

export type ClubSector = (typeof CLUB_SECTORS)[number]
export type ClubSize = (typeof CLUB_SIZES)[number]
export type ClubInterest = (typeof CLUB_INTERESTS)[number]

/** Upper bound for the free-text message, in characters. */
export const CLUB_MESSAGE_MAX = 2000
