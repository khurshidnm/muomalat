import type { DateField } from 'payload'

export const TASHKENT = 'Asia/Tashkent'

/**
 * The time zone setting of every date-time an editor enters (CMS-SPEC §3.1,
 * PHASE0 §1.8). It is the same list as the root `admin.timezones`, set on the
 * field as well so these fields do not depend on the root config: with one
 * supported zone the admin shows and enters Tashkent time, and the picker is
 * read-only. Payload adds a hidden `<name>_tz` enum column; changing the list
 * is a migration. Values are stored as UTC timestamps.
 */
export const tashkentTimezone = {
  defaultTimezone: TASHKENT,
  supportedTimezones: [{ label: 'Toshkent (UTC+05:00)', value: TASHKENT }],
}

/** A day-and-time field shown and entered in Tashkent time. */
export function dateTime(field: Omit<DateField, 'type'>): DateField {
  return {
    ...field,
    type: 'date',
    timezone: tashkentTimezone,
    admin: { ...field.admin, date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm', timeFormat: 'HH:mm' } },
  }
}

/**
 * A system timestamp written by hooks (submittedAt, approvedAt…). No time zone
 * column: like createdAt it shows in the browser's zone (CMS-SPEC §3.1).
 */
export function timestamp(field: Omit<DateField, 'type'>): DateField {
  return { ...field, type: 'date', admin: { ...field.admin, date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm', timeFormat: 'HH:mm' } } }
}

/** `YYYY-MM-DD`, the format of day-only text fields (Source.date, Institution.statusDate). */
export const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Validator for an optional `YYYY-MM-DD` text field. */
export const validateIsoDay = (value: unknown) =>
  value === undefined || value === null || value === '' || (typeof value === 'string' && ISO_DAY.test(value) && !Number.isNaN(Date.parse(value)))
    ? true
    : 'Sanani YYYY-MM-DD shaklida yozing, masalan 2026-10-08.'
