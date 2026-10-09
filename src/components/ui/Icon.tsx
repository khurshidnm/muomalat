/** Inline SVG icon set (24px grid, 1.6 stroke). Decorative by default. */
const PATHS = {
  search: <><circle cx="10.5" cy="10.5" r="6.25" /><path d="m15.2 15.2 5.3 5.3" /></>,
  menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
  close: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  telegram: (
    <>
      <path d="M21.2 3.9 2.9 10.9c-.8.3-.8 1.4 0 1.7l4.5 1.6 1.7 5.4c.2.7 1.1.9 1.6.4l2.5-2.4 4.6 3.4c.6.4 1.4.1 1.6-.6L22.4 5c.2-.8-.5-1.4-1.2-1.1Z" />
      <path d="m7.4 14.2 10.1-6.7-7.4 7.6" />
    </>
  ),
  'arrow-right': <path d="M4.5 12h15m-6-6 6 6-6 6" />,
  'arrow-up-right': <path d="M7 17 17 7m-8 0h8v8" />,
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.66.34l2.8-2.8a4 4 0 0 0-5.66-5.66l-1.1 1.1" />
      <path d="M14 10.5a4 4 0 0 0-5.66-.34l-2.8 2.8a4 4 0 1 0 5.66 5.66l1.1-1.1" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2m0 15v2M4.6 4.6 6 6m12 12 1.4 1.4M2.5 12h2m15 0h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M19.5 14.6A7.5 7.5 0 0 1 9.4 4.5a7.5 7.5 0 1 0 10.1 10.1Z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="1" /><path d="M3.5 9.5h17M8 3v4m8-4v4" /></>,
  pin: <><path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0c0 5 6.5 11 6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="1" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  rss: <><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14" /><circle cx="6" cy="18" r="1.2" fill="currentColor" stroke="none" /></>,
  check: <path d="m4.5 12.5 4.5 4.5 10.5-10.5" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  external: <><path d="M13.5 4.5h6v6m0-6L11 13" /><path d="M18.5 14v5.5h-14v-14H10" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.6v.1" /></>,
  alert: <><path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" /><path d="M12 9.5v4.5m0 2.6v.1" /></>,
  filter: <path d="M3.5 5.5h17l-6.5 7.5v6l-4 1.5V13L3.5 5.5Z" />,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" /><path d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.3" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z" /></>,
  phone: <path d="M6.6 3.5h2.6l1.4 4.1-2 1.6a12.5 12.5 0 0 0 6.2 6.2l1.6-2 4.1 1.4v2.6a1.6 1.6 0 0 1-1.7 1.6A16.5 16.5 0 0 1 5 5.2a1.6 1.6 0 0 1 1.6-1.7Z" />,
  print: <><path d="M6.5 9V3.5h11V9" /><rect x="3.5" y="9" width="17" height="8" rx="1" /><path d="M6.5 14.5h11v6h-11z" /></>,
} as const

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 20,
  className,
  title,
}: {
  name: IconName
  size?: number
  className?: string
  /** Pass a title only when the icon is the sole content of a control. */
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}
