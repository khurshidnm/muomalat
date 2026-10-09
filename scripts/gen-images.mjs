#!/usr/bin/env node
/**
 * Muomalat editorial illustration set.
 *
 * Writes one flat, architectural duotone SVG per entry in
 * src/content/data/images.ts into public/images/. Dependency-free; run with
 *   node scripts/gen-images.mjs
 *
 * Art direction: precise flat shapes + hairline detail on the site palette
 * (paper, warm shade, ink, emerald tints, one brass accent per image).
 * No text, no logos, no gradients, no shadows, no ornament and no religious
 * imagery of any kind. Output is deterministic (seeded PRNG per scene).
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'images')

/* ------------------------------------------------------------------ palette */

const C = {
  paper: '#FAF8F3',
  shade: '#EFE9DC',
  shade2: '#E4DCC8',
  ink: '#10201D',
  em: '#0F6B5C',
  em2: '#2E8574',
  em3: '#7FAE9F',
  em4: '#C9DDD3',
  brass: '#B0843A',
}

/* ---------------------------------------------------------------- utilities */

/** mulberry32 — small deterministic PRNG. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Format a number with at most one decimal. */
const f = (v) => {
  const r = Math.round(v * 10) / 10
  return Object.is(r, -0) ? 0 : r
}

/** Tagged template that formats interpolated numbers (for path data). */
const d = (strings, ...vals) =>
  strings.reduce((s, str, i) => s + str + (i < vals.length ? (typeof vals[i] === 'number' ? f(vals[i]) : vals[i]) : ''), '')

const attrs = (o = {}) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? f(v) : v}"`)
    .join('')

const CONTAINERS = new Set(['g', 'pattern', 'clipPath'])
const indent = (str) => str.replace(/\n/g, '\n  ')
const el = (tag, a, children) => {
  if (children == null) return `<${tag}${attrs(a)}/>`
  const kids = [].concat(children).flat(Infinity).filter(Boolean)
  if (!CONTAINERS.has(tag)) return `<${tag}${attrs(a)}>${kids.join('')}</${tag}>`
  return `<${tag}${attrs(a)}>\n  ${kids.map(indent).join('\n  ')}\n</${tag}>`
}

const rect = (x, y, w, h, fill, a = {}) => el('rect', { x, y, width: w, height: h, fill, ...a })
const line = (x1, y1, x2, y2, stroke = C.ink, sw = 1, a = {}) =>
  el('line', { x1, y1, x2, y2, stroke, 'stroke-width': sw, ...a })
const pts = (list) => list.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')
const poly = (list, fill, a = {}) => el('polygon', { points: pts(list), fill, ...a })
const pline = (list, stroke = C.ink, sw = 1, a = {}) =>
  el('polyline', { points: pts(list), fill: 'none', stroke, 'stroke-width': sw, 'stroke-linejoin': 'round', ...a })
const circ = (cx, cy, r, fill, a = {}) => el('circle', { cx, cy, r, fill, ...a })
const ell = (cx, cy, rx, ry, fill, a = {}) => el('ellipse', { cx, cy, rx, ry, fill, ...a })
const path = (dd, a = {}) => el('path', { d: dd, ...a })
const g = (children, a = {}) => el('g', a, children)
const hair = (stroke = C.ink, sw = 1) => ({ fill: 'none', stroke, 'stroke-width': sw })

/** Many rectangles as one compact path: list of [x, y, w, h]. */
const rectsD = (list) => list.map(([x, y, w, h]) => d`M${x} ${y}h${w}v${h}h${-w}z`).join('')
/** Many line segments as one path: list of [x1, y1, x2, y2]. */
const segsD = (list) => list.map(([a, b, c, e]) => d`M${a} ${b}L${c} ${e}`).join('')
/** Dots as zero-length round-capped segments (very compact). */
const dotsPath = (list, color, size) => {
  let px = 0
  let py = 0
  const dd = list
    .map(([x, y], i) => {
      const s = i === 0 ? d`M${x} ${y}h0` : d`m${x - px} ${y - py}h0`
      px = x
      py = y
      return s
    })
    .join('')
  return path(dd, { stroke: color, 'stroke-width': size, 'stroke-linecap': 'round', fill: 'none' })
}

const rotP = (x, y, cx, cy, deg) => {
  const a = (deg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]
}

class Scene {
  constructor(w, h, seed) {
    this.w = w
    this.h = h
    this.defs = []
    this.body = []
    this.n = 0
    this.rnd = rng(seed)
  }
  id(prefix = 'p') {
    this.n += 1
    return `${prefix}${this.n}`
  }
  def(s) {
    this.defs.push(s)
  }
  add(...xs) {
    for (const x of xs.flat(Infinity)) if (x) this.body.push(x)
  }
  /** random in [a, b) */
  r(a = 0, b = 1) {
    return a + (b - a) * this.rnd()
  }
  svg() {
    const defs = this.defs.length ? `<defs>\n${this.defs.join('\n')}\n</defs>\n` : ''
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}">\n` +
      defs +
      this.body.join('\n') +
      '\n</svg>\n'
    )
  }
}

/* ----------------------------------------------------------------- patterns */

/** Parallel hairlines. angle 0 = vertical lines, 90 = horizontal lines. */
function hatch(S, { color = C.ink, gap = 8, angle = 45, sw = 1, bg } = {}) {
  const id = S.id('h')
  S.def(el('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: `rotate(${angle})` }, [bg ? rect(0, 0, gap, gap, bg) : null, line(gap / 2, -1, gap / 2, gap + 1, color, sw)]))
  return `url(#${id})`
}

/** Staggered dot texture. */
function dots(S, { color = C.ink, gap = 10, r = 1.2, bg } = {}) {
  const id = S.id('d')
  S.def(el('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap }, [bg ? rect(0, 0, gap, gap, bg) : null, circ(gap / 4, gap / 4, r, color), circ((gap * 3) / 4, (gap * 3) / 4, r, color)]))
  return `url(#${id})`
}

/** Square grid of hairlines. */
function gridPat(S, { color = C.shade2, size = 40, sw = 1, x = 0, y = 0 } = {}) {
  const id = S.id('g')
  S.def(el('pattern', { id, patternUnits: 'userSpaceOnUse', x, y, width: size, height: size }, path(d`M${size} 0H0V${size}`, hair(color, sw))))
  return `url(#${id})`
}

/**
 * Window treatment for a facade rectangle, as an aligned pattern.
 * kinds: grid (punched windows), bands (ribbon windows), mullion (curtain
 * wall hairline grid), fins (vertical sun fins).
 */
function winFill(S, x, y, w, h, o) {
  const { kind = 'grid', color, fh = 16, cols = 6, gx = 6, gy = 6, sw = 1 } = o
  const id = S.id('w')
  let tile
  let tw
  let th = fh
  let hh = h
  if (kind === 'grid') {
    tw = (w + gx) / cols
    hh = Math.max(th, Math.floor((h + gy) / th) * th - gy)
    tile = rect(0, 0, tw - gx, th - gy, color)
  } else if (kind === 'bands') {
    tw = w
    hh = Math.max(th, Math.floor(h / th) * th - th * (1 - (o.ratio ?? 0.5)))
    tile = rect(0, 0, tw, th * (o.ratio ?? 0.5), color)
  } else if (kind === 'mullion') {
    tw = o.cw ?? 14
    tile = line(sw / 2, 0, sw / 2, th, color, sw) + line(0, sw / 2, tw, sw / 2, color, sw * 0.8)
  } else {
    tw = o.cw ?? 16
    tile = rect(0, 0, tw * (o.ratio ?? 0.4), th, color)
  }
  S.def(el('pattern', { id, patternUnits: 'userSpaceOnUse', x, y, width: tw, height: th }, tile))
  return rect(x, y, w, hh, `url(#${id})`)
}

/** A flat building: body, optional darker side face, windows, roof kit. */
function tower(S, b) {
  const { x, w, top, base, fill } = b
  const side = b.side ?? 0
  const out = [rect(x, top, w, base - top, fill)]
  if (side) out.push(rect(x + w - side, top, side, base - top, b.sideFill))
  if (b.win) {
    const m = b.win.m ?? 10
    const mt = b.win.mt ?? m + 4
    const mb = b.win.mb ?? 24
    out.push(winFill(S, x + m, top + mt, w - side - 2 * m, base - top - mt - mb, b.win))
  }
  if (b.sideWin && side) {
    out.push(winFill(S, x + w - side + 4, top + 14, side - 8, base - top - 38, b.sideWin))
  }
  if (b.roof) out.push(b.roof)
  return out
}

/* ================================================================== scenes */

const W = 1200
const H = 800

/* ---------------------------------------------------------- city skyline */
function citySkyline() {
  const S = new Scene(W, H, 101)
  const GY = 640
  S.add(rect(0, 0, W, H, C.paper))
  S.add(circ(842, 232, 74, C.brass))
  // mountain ridge on the eastern horizon
  S.add(
    poly(
      [
        [0, 500], [70, 478], [130, 486], [210, 432], [270, 456], [340, 410], [400, 432], [470, 392],
        [540, 426], [610, 404], [680, 440], [760, 398], [830, 420], [900, 380], [980, 418], [1050, 400],
        [1130, 434], [1200, 414], [1200, GY], [0, GY],
      ],
      C.shade2,
    ),
  )
  S.add(
    pline([[210, 432], [236, 446], [262, 442]], C.paper, 1.5),
    pline([[470, 392], [500, 408], [520, 404]], C.paper, 1.5),
    pline([[900, 380], [930, 396], [955, 392]], C.paper, 1.5),
  )
  // far layer
  const far = []
  for (let x = -10; x < W; ) {
    const w = S.r(46, 96)
    far.push([x, S.r(470, 540), w, GY])
    x += w + S.r(4, 22)
  }
  const farD = rectsD(far.map(([x, y, w]) => [x, y, w, GY - y]))
  S.add(path(farD, { fill: C.em4 }))
  S.add(path(farD, { fill: hatch(S, { color: C.paper, gap: 9, angle: 90, sw: 1 }) }))
  // mid layer
  const mids = [
    [20, 340, 88], [128, 400, 70], [380, 300, 80], [520, 360, 64], [700, 320, 92], [800, 410, 70],
    [1000, 330, 84], [1110, 380, 96],
  ]
  for (const [x, top, w] of mids) {
    S.add(tower(S, { x, w, top, base: GY, fill: C.em3, win: { kind: 'mullion', color: C.em4, cw: 12, fh: 14, m: 8, mb: 8 } }))
  }
  // TV mast (tripod base, shaft, two pods, antenna)
  const mx = 196
  S.add(
    poly([[mx - 44, GY], [mx - 36, GY], [mx - 3, GY - 150], [mx - 9, GY - 150]], C.ink),
    poly([[mx + 44, GY], [mx + 36, GY], [mx + 3, GY - 150], [mx + 9, GY - 150]], C.ink),
    rect(mx - 3, GY - 150, 6, 150, C.ink),
    poly([[mx - 9, GY - 150], [mx + 9, GY - 150], [mx + 5, 300], [mx - 5, 300]], C.ink),
    rect(mx - 30, GY - 236, 60, 6, C.ink),
    rect(mx - 4, 300, 8, 18, C.ink),
    rect(mx - 24, 262, 48, 38, C.ink, { rx: 8 }),
    rect(mx - 28, 278, 56, 4, C.em4),
    rect(mx - 2.5, 140, 5, 122, C.ink),
    line(mx, 70, mx, 140, C.ink, 2),
    line(mx - 10, 170, mx + 10, 170, C.ink, 1.2),
    line(mx - 7, 196, mx + 7, 196, C.ink, 1.2),
    line(mx - 8, 222, mx + 8, 222, C.ink, 1.2),
  )
  // front layer
  const front = [
    { x: 268, w: 128, top: 214, fill: C.em, side: 22, sideFill: C.ink, win: { kind: 'grid', color: C.em2, cols: 5, gx: 7, gy: 7, fh: 16, m: 12 } },
    { x: 408, w: 92, top: 322, fill: C.ink, side: 16, sideFill: C.em, win: { kind: 'bands', color: C.em, fh: 15, ratio: 0.45, m: 8 } },
    { x: 556, w: 148, top: 150, fill: C.em2, side: 26, sideFill: C.em, win: { kind: 'mullion', color: C.em4, cw: 15, fh: 15, m: 10, mb: 30 }, sideWin: { kind: 'bands', color: C.em2, fh: 15, ratio: 0.3 } },
    { x: 716, w: 74, top: 392, fill: C.em3, win: { kind: 'grid', color: C.em, cols: 3, gx: 8, gy: 8, fh: 18, m: 10 } },
    { x: 892, w: 168, top: 282, fill: C.em, side: 30, sideFill: C.ink, win: { kind: 'fins', color: C.em2, cw: 14, fh: 40, ratio: 0.45, m: 12, mb: 30 }, sideWin: { kind: 'bands', color: C.em, fh: 16, ratio: 0.35 } },
    { x: 1072, w: 118, top: 366, fill: C.ink, side: 20, sideFill: C.em, win: { kind: 'grid', color: C.em, cols: 4, gx: 8, gy: 8, fh: 18, m: 10 } },
  ]
  for (const b of front) S.add(tower(S, { ...b, base: GY }))
  // crowns and rooftop kit
  S.add(
    rect(296, 188, 70, 26, C.ink),
    rect(312, 172, 38, 16, C.ink),
    line(331, 120, 331, 172, C.ink, 2),
    poly([[556, 150], [704, 150], [704, 132], [600, 108], [556, 108]], C.em),
    line(560, 108, 560, 60, C.ink, 1.5),
    rect(930, 262, 60, 20, C.ink),
    rect(1000, 270, 30, 12, C.ink),
    rect(424, 306, 44, 16, C.em),
    rect(1094, 350, 48, 16, C.em),
  )
  // low podiums
  S.add(
    rect(0, 540, 150, GY - 540, C.em2),
    winFill(S, 10, 556, 130, 70, { kind: 'bands', color: C.em, fh: 18, ratio: 0.45 }),
    rect(790, 520, 102, GY - 520, C.em2),
    winFill(S, 800, 536, 82, 90, { kind: 'grid', color: C.em4, cols: 4, gx: 6, gy: 8, fh: 22 }),
  )
  // street trees
  const trees = []
  for (let x = 20; x < W; x += S.r(44, 70)) trees.push([x, S.r(12, 17)])
  S.add(trees.map(([x]) => line(x, GY - 16, x, GY, C.ink, 1.5)))
  S.add(trees.map(([x, r], i) => circ(x, GY - 18 - r * 0.8, r, i % 3 === 0 ? C.em : C.em2)))
  S.add(rect(0, GY - 8, W, 8, C.em2))
  // ground and road
  S.add(
    rect(0, GY, W, H - GY, C.shade),
    line(0, GY, W, GY, C.ink, 1.5),
    rect(0, GY + 44, W, 72, C.shade2),
    line(0, GY + 80, W, GY + 80, C.paper, 3, { 'stroke-dasharray': '34 26' }),
    line(0, GY + 44, W, GY + 44, C.ink, 1),
    line(0, GY + 116, W, GY + 116, C.ink, 1),
    rect(0, GY + 130, W, H - GY - 130, dots(S, { color: C.shade2, gap: 12, r: 1.3 })),
  )
  return S
}

/* ------------------------------------------------------------ city street */
function cityStreet() {
  const S = new Scene(W, H, 202)
  const GY = 610
  S.add(rect(0, 0, W, H, C.paper))
  // distant towers
  S.add(path(rectsD([[60, 210, 110, 400], [300, 250, 80, 360], [650, 180, 120, 430], [900, 240, 90, 370], [1080, 200, 100, 410]]), { fill: C.em4 }))
  S.add(path(rectsD([[70, 226, 90, 380], [310, 266, 60, 340], [664, 196, 92, 410], [910, 256, 70, 350], [1092, 216, 76, 390]]), { fill: hatch(S, { color: C.paper, gap: 10, angle: 90 }) }))
  // street buildings (elevations)
  const blocks = [
    { x: -10, w: 262, top: 340, fill: C.em3, win: C.em, cornice: C.em2 },
    { x: 252, w: 282, top: 272, fill: C.shade2, win: C.em2, cornice: C.ink },
    { x: 534, w: 252, top: 382, fill: C.paper, win: null, cornice: C.ink },
    { x: 786, w: 236, top: 300, fill: C.em, win: C.em2, cornice: C.ink },
    { x: 1022, w: 190, top: 356, fill: C.shade2, win: C.em3, cornice: C.em },
  ]
  for (const b of blocks) {
    S.add(rect(b.x, b.top, b.w, GY - b.top, b.fill))
    S.add(rect(b.x - 4, b.top - 12, b.w + 8, 14, b.cornice))
    if (b.win) {
      S.add(winFill(S, b.x + 22, b.top + 30, b.w - 44, GY - b.top - 140, { kind: 'grid', color: b.win, cols: Math.round(b.w / 56), gx: 18, gy: 26, fh: 62 }))
    }
    // ground floor shopfronts
    S.add(rect(b.x + 14, GY - 90, b.w - 28, 90, C.ink))
    S.add(winFill(S, b.x + 20, GY - 84, b.w - 40, 84, { kind: 'mullion', color: C.em2, cw: 46, fh: 200, sw: 2 }))
    S.add(rect(b.x + 8, GY - 100, b.w - 16, 10, b.cornice === C.ink ? C.em : C.ink))
  }
  // modernist block with vertical fins
  S.add(rect(546, 404, 228, 104, C.em), winFill(S, 546, 404, 228, 104, { kind: 'fins', color: C.shade, cw: 19, fh: 104, ratio: 0.32 }))
  S.add(line(534, 512, 786, 512, C.ink, 1.5))
  // awnings
  S.add(rect(270, GY - 112, 120, 12, C.em), rect(830, GY - 112, 140, 12, C.em3))
  // overhead tram wire, poles
  const wireY = 470
  S.add(line(0, wireY, W, wireY, C.ink, 1.2), line(0, wireY - 8, W, wireY - 8, C.ink, 0.8))
  for (const px of [96, 640, 1150]) {
    S.add(rect(px - 3, wireY - 30, 6, GY + 22 - (wireY - 30), C.ink), line(px, wireY - 22, px + 40, wireY - 8, C.ink, 1.2), rect(px - 6, wireY - 36, 12, 6, C.ink))
  }
  // plane trees on the pavement
  const treeAt = (x, s) => {
    const dp = dots(S, { color: C.em, gap: 9, r: 1.4 })
    return [
      rect(x - 4, 430, 8, GY + 20 - 430, C.ink),
      line(x, 470, x - 26, 432, C.ink, 3),
      line(x, 462, x + 30, 420, C.ink, 3),
      circ(x - 34 * s, 410, 46 * s, C.em2),
      circ(x + 30 * s, 396, 52 * s, C.em2),
      circ(x, 360, 54 * s, C.em2),
      circ(x - 34 * s, 410, 46 * s, dp),
      circ(x + 30 * s, 396, 52 * s, dp),
      circ(x, 360, 54 * s, dp),
    ]
  }
  S.add(treeAt(196, 1), treeAt(1010, 0.95))
  // pavement
  S.add(rect(0, GY, W, 24, C.shade2), line(0, GY, W, GY, C.ink, 1.2), rect(0, GY + 24, W, H - GY - 24, C.shade), line(0, GY + 24, W, GY + 24, C.ink, 1.5))
  // tram
  const tx = 318
  const tw = 620
  const tTop = 560
  const tBot = 696
  S.add(
    rect(tx + 60, tTop - 14, 200, 14, C.ink),
    rect(tx + 380, tTop - 12, 150, 12, C.ink),
    pline([[tx + 150, tTop - 14], [tx + 190, wireY + 30], [tx + 150, wireY + 4]], C.ink, 2),
    line(tx + 130, wireY + 4, tx + 190, wireY + 4, C.ink, 2.5),
    path(d`M${tx + 26} ${tTop}H${tx + tw - 26}Q${tx + tw} ${tTop} ${tx + tw + 6} ${tTop + 40}L${tx + tw + 10} ${tBot}H${tx - 10}L${tx - 6} ${tTop + 40}Q${tx} ${tTop} ${tx + 26} ${tTop}Z`, { fill: C.em }),
    poly([[tx + 4, tTop + 14], [tx + 40, tTop + 14], [tx + 40, tTop + 66], [tx - 4, tTop + 66]], C.em4),
    poly([[tx + tw - 40, tTop + 14], [tx + tw - 4, tTop + 14], [tx + tw + 4, tTop + 66], [tx + tw - 40, tTop + 66]], C.em4),
    winFill(S, tx + 56, tTop + 14, tw - 112, 52, { kind: 'grid', color: C.em4, cols: 9, gx: 10, gy: 0, fh: 52 }),
  )
  for (const dx of [130, 300, 470]) {
    S.add(rect(tx + dx, tTop + 10, 52, tBot - tTop - 26, C.em2), line(tx + dx + 26, tTop + 10, tx + dx + 26, tBot - 16, C.em, 1.5), rect(tx + dx + 6, tTop + 18, 16, 50, C.em4), rect(tx + dx + 30, tTop + 18, 16, 50, C.em4))
  }
  S.add(
    line(tx - 4, tTop + 86, tx + tw + 6, tTop + 86, C.brass, 3),
    rect(tx - 10, tBot - 16, tw + 20, 16, C.ink),
    circ(tx + 70, tBot, 9, C.ink), circ(tx + 100, tBot, 9, C.ink), circ(tx + tw - 100, tBot, 9, C.ink), circ(tx + tw - 70, tBot, 9, C.ink),
  )
  // car
  const cx0 = 980
  S.add(
    path(d`M${cx0} 700L${cx0 + 4} 676Q${cx0 + 10} 664 ${cx0 + 30} 662L${cx0 + 56} 640Q${cx0 + 64} 634 ${cx0 + 80} 634H${cx0 + 136}Q${cx0 + 150} 634 ${cx0 + 160} 646L${cx0 + 176} 662Q${cx0 + 196} 666 ${cx0 + 198} 680L${cx0 + 198} 700Z`, { fill: C.ink }),
    poly([[cx0 + 64, 646], [cx0 + 104, 646], [cx0 + 104, 662], [cx0 + 48, 662]], C.em4),
    poly([[cx0 + 112, 646], [cx0 + 148, 646], [cx0 + 162, 662], [cx0 + 112, 662]], C.em4),
    circ(cx0 + 44, 700, 15, C.ink), circ(cx0 + 44, 700, 6, C.shade2),
    circ(cx0 + 158, 700, 15, C.ink), circ(cx0 + 158, 700, 6, C.shade2),
  )
  // road markings
  S.add(line(0, 704, W, 704, C.ink, 1), line(0, 708, W, 708, C.ink, 1), line(0, 756, W, 756, C.paper, 4, { 'stroke-dasharray': '48 36' }))
  return S
}

/* ---------------------------------------------------------- facade lattice */
function facadeLattice() {
  const S = new Scene(W, H, 303)
  const concrete = C.shade2
  S.add(rect(0, 0, W, H, C.paper))
  S.add(circ(170, 214, 70, C.brass))
  // lattice tile: frame, dark opening, rhombic screen element with depth faces
  const T = 64
  const id = S.id('lat')
  S.def(
    `<pattern id="${id}" patternUnits="userSpaceOnUse" x="216" y="150" width="${T}" height="${T}">` +
      rect(0, 0, T, T, concrete) +
      rect(5, 5, T - 10, T - 10, C.em) +
      poly([[5, 5], [T - 5, 5], [T - 9, 9], [9, 9], [9, T - 9], [5, T - 5]], C.em2) +
      poly([[32, 9], [55, 32], [32, 55], [9, 32]], concrete) +
      poly([[55, 32], [32, 55], [32, 49], [49, 32]], C.em3) +
      line(32, 9, 32, 55, C.shade, 1) +
      line(9, 32, 55, 32, C.shade, 1) +
      `</pattern>`,
  )
  // building mass
  S.add(rect(196, 106, 940, 26, C.ink))
  S.add(rect(200, 132, 932, 482, concrete))
  S.add(rect(216, 150, 14 * T, 7 * T, `url(#${id})`))
  S.add(line(200, 132, 1132, 132, C.ink, 1), line(200, 614, 1132, 614, C.ink, 1))
  // end wall (stair core) with vertical score lines
  S.add(rect(1112, 132, 20, 482, C.em3))
  // plinth on pilotis
  S.add(rect(236, 614, 876, 104, C.ink))
  S.add(winFill(S, 236, 628, 876, 90, { kind: 'mullion', color: C.em2, cw: 42, fh: 300, sw: 1.5 }))
  S.add(line(236, 660, 1112, 660, C.em2, 1.5))
  for (let x = 236; x <= 1100; x += 128) S.add(rect(x, 614, 30, 104, concrete), rect(x + 22, 614, 8, 104, C.em3))
  // entrance canopy and steps
  S.add(rect(620, 614, 140, 10, concrete), rect(600, 718, 180, 8, C.shade2), rect(588, 726, 204, 8, C.shade2))
  // ground
  S.add(rect(0, 718, W, H - 718, C.shade), line(0, 718, W, 718, C.ink, 1.5))
  S.add(rect(0, 742, W, H - 742, hatch(S, { color: C.shade2, gap: 10, angle: 90 })))
  // clipped hedges
  for (const x of [250, 330, 410, 800, 880, 960]) S.add(rect(x, 696, 66, 22, C.em2, { rx: 11 }))
  // pyramidal poplars
  const poplar = (x, top, w, col) => [
    line(x, top + 60, x, 718, C.ink, 2),
    path(d`M${x} ${top}C${x + w} ${top + 90} ${x + w} ${560} ${x} ${640}C${x - w} ${560} ${x - w} ${top + 90} ${x} ${top}Z`, { fill: col }),
    line(x, top + 40, x, 630, col === C.em ? C.em2 : C.em, 1),
  ]
  S.add(poplar(1158, 300, 26, C.em), poplar(1184, 360, 22, C.em2), poplar(70, 380, 28, C.em2), poplar(110, 430, 22, C.em))
  return S
}

/* ---------------------------------------------------------------- bank hall */
function bankHall() {
  const S = new Scene(W, H, 404)
  const cx = 600
  const cy = 360
  const F = 250
  const EYE = 1.7
  const pr = (X, Y, Z) => [cx + (F * X) / Z, cy - (F * (Y - EYE)) / Z]
  const quad = (list, fill, a) => poly(list.map((p) => pr(...p)), fill, a)
  const segs = (list, stroke, sw) => path(segsD(list.map(([a, b]) => [...pr(...a), ...pr(...b)])), hair(stroke, sw))
  const Wd = 4.6
  const Ht = 4.2
  const ZB = 3.0
  const Z0 = 0.5
  S.add(rect(0, 0, W, H, C.paper))
  // shell: ceiling, floor, side walls, back wall
  S.add(quad([[-Wd, Ht, Z0], [Wd, Ht, Z0], [Wd, Ht, ZB], [-Wd, Ht, ZB]], C.em4))
  S.add(quad([[-Wd, 0, Z0], [Wd, 0, Z0], [Wd, 0, ZB], [-Wd, 0, ZB]], C.shade))
  S.add(quad([[-Wd, 0, Z0], [-Wd, Ht, Z0], [-Wd, Ht, ZB], [-Wd, 0, ZB]], C.shade2))
  S.add(quad([[Wd, 0, Z0], [Wd, Ht, Z0], [Wd, Ht, ZB], [Wd, 0, ZB]], C.shade2))
  S.add(quad([[-Wd, 0, ZB], [Wd, 0, ZB], [Wd, Ht, ZB], [-Wd, Ht, ZB]], C.paper))
  // stone floor, checkered
  const tiles = []
  const ts = 0.46
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 6; j++) {
      if ((i + j) % 2) continue
      const x0 = -Wd + i * ts
      const z0 = ZB - (j + 1) * ts
      const z1 = ZB - j * ts
      if (z1 <= Z0) continue
      tiles.push([pr(x0, 0, Math.max(Z0, z0)), pr(x0 + ts, 0, Math.max(Z0, z0)), pr(x0 + ts, 0, z1), pr(x0, 0, z1)])
    }
  }
  S.add(path(tiles.map((q) => 'M' + q.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z').join(''), { fill: C.shade2 }))
  // central runner leading to the counter
  S.add(quad([[-0.75, 0, Z0], [0.75, 0, Z0], [0.75, 0, 2.62], [-0.75, 0, 2.62]], C.em2))
  S.add(segs([[[-0.62, 0, Z0], [-0.62, 0, 2.55]], [[0.62, 0, Z0], [0.62, 0, 2.55]], [[-0.62, 0, 2.55], [0.62, 0, 2.55]]], C.em4, 1.2))
  // coffered ceiling with light panels
  const cof = []
  const xs = [-4.6, -3.45, -2.3, -1.15, 0, 1.15, 2.3, 3.45, 4.6]
  const zs = [0.5, 0.75, 1.05, 1.4, 1.8, 2.3, 3.0]
  for (const X of xs) cof.push([[X, Ht, Z0], [X, Ht, ZB]])
  for (const Z of zs) cof.push([[-Wd, Ht, Z], [Wd, Ht, Z]])
  S.add(segs(cof, C.em3, 1.5))
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      if ((i + j) % 2 === 0) continue
      const ix = (xs[i + 1] - xs[i]) * 0.28
      const iz = (zs[j + 1] - zs[j]) * 0.28
      S.add(quad([[xs[i] + ix, Ht, zs[j] + iz], [xs[i + 1] - ix, Ht, zs[j] + iz], [xs[i + 1] - ix, Ht, zs[j + 1] - iz], [xs[i] + ix, Ht, zs[j + 1] - iz]], C.paper))
    }
  }
  // side walls: tall windows
  for (const sgn of [-1, 1]) {
    for (const [z0, z1] of [[0.62, 0.95], [1.25, 1.65], [2.05, 2.55]]) {
      S.add(quad([[sgn * Wd, 0.8, z0], [sgn * Wd, 3.6, z0], [sgn * Wd, 3.6, z1], [sgn * Wd, 0.8, z1]], C.em3))
      S.add(segs([[[sgn * Wd, 1.7, z0], [sgn * Wd, 1.7, z1]], [[sgn * Wd, 2.65, z0], [sgn * Wd, 2.65, z1]], [[sgn * Wd, 0.8, (z0 + z1) / 2], [sgn * Wd, 3.6, (z0 + z1) / 2]]], C.paper, 1.5))
    }
    S.add(quad([[sgn * Wd, 0, Z0], [sgn * Wd, 0.3, Z0], [sgn * Wd, 0.3, ZB], [sgn * Wd, 0, ZB]], C.em))
  }
  // back wall: clerestory, fascia with brass rule, teller screens, counter
  for (let k = 0; k < 8; k++) {
    const x0 = -4.2 + k * 1.06
    S.add(quad([[x0, 3.3, ZB], [x0 + 0.8, 3.3, ZB], [x0 + 0.8, 3.95, ZB], [x0, 3.95, ZB]], C.em4))
    S.add(segs([[[x0 + 0.4, 3.3, ZB], [x0 + 0.4, 3.95, ZB]]], C.paper, 1.5))
  }
  S.add(quad([[-Wd, 2.55, ZB], [Wd, 2.55, ZB], [Wd, 3.05, ZB], [-Wd, 3.05, ZB]], C.em))
  S.add(quad([[-Wd, 2.47, ZB], [Wd, 2.47, ZB], [Wd, 2.5, ZB], [-Wd, 2.5, ZB]], C.brass))
  const ZC = 2.72
  for (let k = 0; k < 6; k++) {
    const x0 = -4.2 + k * 1.4
    S.add(quad([[x0 + 0.1, 1.05, ZB], [x0 + 1.3, 1.05, ZB], [x0 + 1.3, 2.2, ZB], [x0 + 0.1, 2.2, ZB]], C.em4))
    S.add(quad([[x0 + 0.45, 1.05, ZB], [x0 + 0.95, 1.05, ZB], [x0 + 0.95, 1.3, ZB], [x0 + 0.45, 1.3, ZB]], C.em3))
    S.add(segs([[[x0 + 0.8, 1.5, ZB], [x0 + 1.15, 1.85, ZB]], [[x0 + 0.95, 1.5, ZB], [x0 + 1.15, 1.7, ZB]]], C.paper, 2))
  }
  S.add(quad([[-Wd, 2.2, ZB], [Wd, 2.2, ZB], [Wd, 2.32, ZB], [-Wd, 2.32, ZB]], C.ink))
  const posts = []
  for (let k = 0; k <= 6; k++) posts.push([-4.2 + k * 1.4, 1.05, 2.2])
  for (const [x, y0, y1] of posts) S.add(quad([[x - 0.05, y0, ZB], [x + 0.05, y0, ZB], [x + 0.05, y1, ZB], [x - 0.05, y1, ZB]], C.ink))
  S.add(quad([[-Wd, 1.0, ZC], [Wd, 1.0, ZC], [Wd, 1.0, ZB], [-Wd, 1.0, ZB]], C.shade2))
  S.add(quad([[-Wd, 0, ZC], [Wd, 0, ZC], [Wd, 1.0, ZC], [-Wd, 1.0, ZC]], C.em))
  S.add(quad([[-Wd, 0.94, ZC], [Wd, 0.94, ZC], [Wd, 1.0, ZC], [-Wd, 1.0, ZC]], C.ink))
  const pan = []
  for (let k = 1; k < 12; k++) pan.push([[-Wd + k * 0.766, 0.12, ZC], [-Wd + k * 0.766, 0.82, ZC]])
  S.add(segs(pan, C.em2, 1.5))
  // queue stanchions with sagging ropes
  const ZQ = 2.35
  const qx = [-2.9, -2.0, -1.1, 1.1, 2.0, 2.9]
  for (const X of qx) {
    const [x0, y0] = pr(X, 0, ZQ)
    const [, y1] = pr(X, 0.9, ZQ)
    S.add(ell(x0, y0, 12, 3.5, C.ink), line(x0, y0, x0, y1, C.ink, 3), circ(x0, y1, 4, C.ink))
  }
  for (const [a, b] of [[-2.9, -2.0], [-2.0, -1.1], [1.1, 2.0], [2.0, 2.9]]) {
    const [xa, ya] = pr(a, 0.85, ZQ)
    const [xb] = pr(b, 0.85, ZQ)
    S.add(path(d`M${xa} ${ya}Q${(xa + xb) / 2} ${ya + 22} ${xb} ${ya}`, hair(C.em, 3)))
  }
  // square piers (rectangular in plan)
  const cols = []
  for (const xc of [-3.0, -1.35, 1.35, 3.0]) cols.push([xc, 2.15])
  const sx = 0.22
  const sz = 0.12
  for (const [xc, zc] of cols) {
    const inner = xc < 0 ? xc + sx : xc - sx
    S.add(quad([[inner, 0, zc - sz], [inner, Ht, zc - sz], [inner, Ht, zc + sz], [inner, 0, zc + sz]], C.em3))
    S.add(quad([[xc - sx, 0, zc - sz], [xc + sx, 0, zc - sz], [xc + sx, Ht, zc - sz], [xc - sx, Ht, zc - sz]], C.paper, { stroke: C.ink, 'stroke-width': 1 }))
    const cX = sx + 0.07
    const cZ = sz + 0.05
    for (const [y0, y1] of [[Ht - 0.26, Ht], [0, 0.2]]) {
      const innerC = xc < 0 ? xc + cX : xc - cX
      S.add(quad([[innerC, y0, zc - cZ], [innerC, y1, zc - cZ], [innerC, y1, zc + cZ], [innerC, y0, zc + cZ]], C.em2))
      S.add(quad([[xc - cX, y0, zc - cZ], [xc + cX, y0, zc - cZ], [xc + cX, y1, zc - cZ], [xc - cX, y1, zc - cZ]], C.shade2, { stroke: C.ink, 'stroke-width': 1 }))
    }
    S.add(segs([[[xc - sx * 0.45, 0.2, zc - sz], [xc - sx * 0.45, Ht - 0.26, zc - sz]], [[xc + sx * 0.45, 0.2, zc - sz], [xc + sx * 0.45, Ht - 0.26, zc - sz]]], C.shade2, 1.2))
  }
  return S
}

/* -------------------------------------------------------------- glass tower */
function glassTower() {
  const S = new Scene(W, H, 505)
  const GY = 700
  S.add(rect(0, 0, W, H, C.paper))
  // background blocks
  S.add(tower(S, { x: 940, w: 120, top: 210, base: GY, fill: C.em4, win: { kind: 'bands', color: C.paper, fh: 14, ratio: 0.35, m: 8 } }))
  S.add(tower(S, { x: 70, w: 150, top: 330, base: GY, fill: C.em4, win: { kind: 'grid', color: C.paper, cols: 6, gx: 8, gy: 8, fh: 20, m: 12 } }))
  S.add(tower(S, { x: 200, w: 190, top: 430, base: GY, fill: C.shade2, side: 30, sideFill: C.em4, win: { kind: 'grid', color: C.em3, cols: 6, gx: 10, gy: 10, fh: 26, m: 14 } }))
  S.add(tower(S, { x: 830, w: 220, top: 380, base: GY, fill: C.em3, side: 34, sideFill: C.em2, win: { kind: 'fins', color: C.em4, cw: 16, fh: 30, ratio: 0.3, m: 12 } }))
  // the tower
  const L = 430
  const R = 690
  const SR = 792
  const front = [[L, 116], [R, 74], [R, GY], [L, GY]]
  const side = [[R, 74], [SR, 100], [SR, GY], [R, GY]]
  S.add(poly(front, C.em3), poly(side, C.em))
  // reflections on the front face
  S.add(poly([[L, 470], [R, 290], [R, 350], [L, 530]], C.em4), poly([[L, 560], [R, 380], [R, 398], [L, 578]], C.em4), poly([[L, 250], [R, 70 + 6], [R, 120], [L, 294]], C.em4))
  // curtain-wall mullions
  const mfront = winFill(S, L, 60, R - L, GY - 60, { kind: 'mullion', color: C.em2, cw: 26, fh: 18, sw: 1 })
  const mside = winFill(S, R, 60, SR - R, GY - 60, { kind: 'mullion', color: C.em2, cw: 17, fh: 18, sw: 1 })
  const clipF = S.id('c')
  const clipS = S.id('c')
  S.def(`<clipPath id="${clipF}">${poly(front, C.ink)}</clipPath>`)
  S.def(`<clipPath id="${clipS}">${poly(side, C.ink)}</clipPath>`)
  S.add(g(mfront, { 'clip-path': `url(#${clipF})` }), g(mside, { 'clip-path': `url(#${clipS})` }))
  // lit floor
  S.add(winFill(S, L + 2, 384, R - L - 4, 14, { kind: 'grid', color: C.brass, cols: 10, gx: 4, gy: 0, fh: 14 }))
  // crown edges and mast
  S.add(pline([[L, 116], [R, 74], [SR, 100]], C.ink, 2), line(R, 74, R, GY, C.ink, 1.2), line(R - 40, 80, R - 40, 30, C.ink, 1.5))
  // podium, canopy, entrance
  S.add(rect(372, 622, 480, GY - 622, C.ink), winFill(S, 382, 636, 460, 64, { kind: 'mullion', color: C.em2, cw: 32, fh: 200, sw: 1.5 }), rect(366, 614, 492, 8, C.em))
  S.add(rect(520, 650, 120, 50, C.em4), line(580, 650, 580, GY, C.ink, 1.5), rect(500, 640, 160, 8, C.em2))
  // plaza
  S.add(rect(0, GY, W, H - GY, C.shade), line(0, GY, W, GY, C.ink, 1.5))
  S.add(rect(0, GY + 16, W, H - GY - 16, gridPat(S, { color: C.shade2, size: 34, y: GY + 16 })))
  // trees and benches
  for (const x of [70, 150, 230, 310, 900, 980, 1060, 1140]) S.add(line(x, GY - 30, x, GY, C.ink, 1.5), circ(x, GY - 44, 22, x % 160 === 70 || x % 160 === 140 ? C.em : C.em2))
  S.add(rect(410, GY + 30, 70, 8, C.em), rect(740, GY + 30, 70, 8, C.em))
  return S
}

/* ----------------------------------------------------------------- charts */
function chartAxes(S, X0, Y0, X1, Y1, { xt = 12, yt = 5, dashed = true } = {}) {
  const out = []
  const grid = []
  for (let i = 1; i <= yt; i++) {
    const y = Y1 - ((Y1 - Y0) * i) / yt
    grid.push([X0, y, X1, y])
  }
  out.push(path(segsD(grid), hair(C.shade2, 1)))
  const vg = []
  for (let i = 1; i < xt; i++) {
    const x = X0 + ((X1 - X0) * i) / xt
    vg.push([x, Y0, x, Y1])
  }
  out.push(path(segsD(vg), { ...hair(C.em4, 1), 'stroke-dasharray': dashed ? '2 6' : undefined }))
  const ticks = []
  for (let i = 0; i <= xt; i++) {
    const x = X0 + ((X1 - X0) * i) / xt
    ticks.push([x, Y1, x, Y1 + 10])
    if (i < xt) ticks.push([x + (X1 - X0) / xt / 2, Y1, x + (X1 - X0) / xt / 2, Y1 + 5])
  }
  for (let i = 0; i <= yt; i++) {
    const y = Y1 - ((Y1 - Y0) * i) / yt
    ticks.push([X0 - 12, y, X0 - 2, y])
  }
  out.push(path(segsD(ticks), hair(C.ink, 1)))
  out.push(line(X0, Y0 - 10, X0, Y1, C.ink, 1.5), line(X0, Y1, X1 + 10, Y1, C.ink, 1.5))
  return out
}

function chartLine() {
  const S = new Scene(W, H, 606)
  const [X0, Y0, X1, Y1] = [120, 130, 1080, 650]
  S.add(rect(0, 0, W, H, C.paper))
  const N = 60
  const xs = (i) => X0 + ((X1 - X0) * i) / (N - 1)
  // highlighted recent period
  S.add(rect(xs(44), Y0, xs(N - 1) - xs(44), Y1 - Y0, C.shade))
  S.add(chartAxes(S, X0, Y0, X1, Y1, { xt: 12, yt: 5 }))
  let v = 0.22
  const a = []
  for (let i = 0; i < N; i++) {
    v += 0.0105 + (S.r() - 0.5) * 0.045 + (i > 27 && i < 35 ? -0.034 : 0)
    a.push(v)
  }
  let u = 0.18
  const b = []
  for (let i = 0; i < N; i++) {
    u += 0.0055 + (S.r() - 0.5) * 0.025
    b.push(u)
  }
  const lo0 = Math.min(...a, ...b)
  const hi0 = Math.max(...a, ...b)
  const ys = (t) => Y1 - (Y1 - Y0) * (0.1 + (0.8 * (t - lo0)) / (hi0 - lo0))
  const A = a.map((t, i) => [xs(i), ys(t)])
  const B = b.map((t, i) => [xs(i), ys(t)])
  S.add(poly([[X0, Y1], ...A, [X1, Y1]], C.em4))
  S.add(poly([[X0, Y1], ...A, [X1, Y1]], hatch(S, { color: C.em3, gap: 8, angle: 45, sw: 1 })))
  S.add(pline(B, C.em2, 2, { 'stroke-dasharray': '7 6' }))
  S.add(pline(A, C.em, 3.5))
  const last = A[N - 1]
  S.add(line(last[0], last[1], X1 + 40, last[1], C.ink, 1, { 'stroke-dasharray': '3 4' }))
  S.add(line(X1 + 40, last[1] - 16, X1 + 40, last[1] + 16, C.ink, 1.5))
  S.add(circ(last[0], last[1], 11, C.paper), circ(last[0], last[1], 7, C.brass))
  // low point marker (hollow)
  let lo = 30
  for (let i = 28; i < 40; i++) if (a[i] < a[lo]) lo = i
  S.add(circ(A[lo][0], A[lo][1], 6, C.paper, { stroke: C.em, 'stroke-width': 2 }))
  S.add(line(A[lo][0], A[lo][1] + 10, A[lo][0], Y1, C.em, 1, { 'stroke-dasharray': '2 4' }))
  return S
}

function chartBars() {
  const S = new Scene(W, H, 707)
  const [X0, Y0, X1, Y1] = [120, 110, 1080, 520]
  S.add(rect(0, 0, W, H, C.paper))
  S.add(chartAxes(S, X0, Y0, X1, Y1, { xt: 12, yt: 4, dashed: true }))
  const N = 12
  const gw = (X1 - X0) / N
  const bw = 26
  const bars = []
  let v = 0.28
  for (let i = 0; i < N; i++) {
    v += 0.045 + (S.r() - 0.4) * 0.07
    const v2 = v * (0.62 + S.r() * 0.18)
    const x = X0 + gw * i + gw / 2
    bars.push({ x, v: Math.min(v, 0.95), v2 })
  }
  for (const [i, b] of bars.entries()) {
    const h1 = (Y1 - Y0) * b.v
    const h2 = (Y1 - Y0) * b.v2
    S.add(rect(b.x - bw - 2, Y1 - h1, bw, h1, i === N - 1 ? C.brass : C.em))
    S.add(rect(b.x + 2, Y1 - h2, bw, h2, C.em3))
  }
  // trend line over the totals
  S.add(pline(bars.map((b) => [b.x - bw / 2 - 2, Y1 - (Y1 - Y0) * b.v - 18]), C.ink, 1.2, { 'stroke-dasharray': '2 5' }))
  // lower panel: growth rates (diverging)
  const P0 = 580
  const P1 = 700
  const Z = 650
  S.add(rect(X0, P0, X1 - X0, P1 - P0, C.shade))
  S.add(line(X0, Z, X1, Z, C.ink, 1.2), line(X0, P0, X0, P1, C.ink, 1.5))
  S.add(path(segsD([[X0 - 12, P0, X0 - 2, P0], [X0 - 12, Z, X0 - 2, Z], [X0 - 12, P1, X0 - 2, P1]]), hair(C.ink, 1)))
  for (let i = 0; i < N * 2; i++) {
    const x = X0 + ((X1 - X0) * (i + 0.5)) / (N * 2)
    const g1 = Math.sin(i * 0.9) * 0.5 + (S.r() - 0.35) * 0.7
    const h = Math.max(4, Math.abs(g1) * 54)
    S.add(rect(x - 9, g1 >= 0 ? Z - h : Z, 18, h, g1 >= 0 ? C.em2 : C.ink))
  }
  return S
}

function chartCandles() {
  const S = new Scene(W, H, 808)
  // Fewer, fatter candles than a real terminal shows: the set is read at
  // 300px card width, where 40+ hairline candles collapse into noise.
  const [X0, Y0, X1, Y1] = [100, 90, 1060, 548]
  S.add(rect(0, 0, W, H, C.paper))
  // right price axis
  S.add(line(X1 + 10, Y0 - 10, X1 + 10, Y1, C.ink, 1.5))
  const rt = []
  for (let i = 0; i <= 10; i++) rt.push([X1 + 10, Y0 + ((Y1 - Y0) * i) / 10, X1 + (i % 2 ? 16 : 22), Y0 + ((Y1 - Y0) * i) / 10])
  S.add(path(segsD(rt), hair(C.ink, 1)))
  const N = 24
  const sp = (X1 - X0) / N
  const bw = 22
  let c = 0.3
  const cs = []
  for (let i = 0; i < N; i++) {
    const o = c
    // rally, a sharp sell-off in the middle, then recovery to a new high
    const drift = i < 9 ? 0.03 : i < 14 ? -0.05 : 0.042
    c = o + drift + (S.r() - 0.5) * 0.06
    const hi = Math.max(o, c) + S.r() * 0.03 + 0.012
    const lo = Math.min(o, c) - S.r() * 0.03 - 0.012
    cs.push({ o, c, hi, lo, vol: 0.3 + S.r() * 0.55 + (i > 9 && i < 14 ? 0.15 : 0) })
  }
  const mn = Math.min(...cs.map((k) => k.lo))
  const mx = Math.max(...cs.map((k) => k.hi))
  const ys = (t) => Y1 - (Y1 - Y0) * (0.06 + ((t - mn) / (mx - mn)) * 0.86)
  const wicks = []
  const ups = []
  const downs = []
  for (const [i, k] of cs.entries()) {
    const x = X0 + sp * (i + 0.5)
    wicks.push([x, ys(k.hi), x, ys(k.lo)])
    const top = ys(Math.max(k.o, k.c))
    const bh = Math.max(6, Math.abs(ys(k.o) - ys(k.c)))
    ;(k.c >= k.o ? ups : downs).push([x - bw / 2, top, bw, bh])
  }
  // sell-off window and the prior high it broke from
  S.add(rect(X0 + sp * 9, Y0, sp * 5, Y1 - Y0, C.shade))
  S.add(chartAxes(S, X0, Y0, X1, Y1, { xt: 8, yt: 5 }))
  const prevHi = ys(Math.max(...cs.slice(0, 10).map((k) => k.hi)))
  S.add(line(X0, prevHi, X1, prevHi, C.em3, 1.5, { 'stroke-dasharray': '10 6' }))
  // moving average (the single brass line) sits behind the candles
  const ma = []
  for (let i = 4; i < N; i++) {
    let s = 0
    for (let j = i - 4; j <= i; j++) s += (cs[j].o + cs[j].c) / 2
    ma.push([X0 + sp * (i + 0.5), ys(s / 5)])
  }
  S.add(pline(ma, C.brass, 4))
  S.add(path(segsD(wicks), hair(C.ink, 2)))
  S.add(path(rectsD(ups), { fill: C.em }))
  S.add(path(rectsD(downs), { fill: C.paper, stroke: C.ink, 'stroke-width': 2.4 }))
  // last price tag on the right axis
  const lc = ys(cs[N - 1].c)
  S.add(line(X0, lc, X1 + 10, lc, C.em, 1.2, { 'stroke-dasharray': '3 5' }))
  S.add(poly([[X1 + 10, lc], [X1 + 24, lc - 13], [X1 + 80, lc - 13], [X1 + 80, lc + 13], [X1 + 24, lc + 13]], C.em))
  // volume panel
  const V0 = 596
  const V1 = 706
  S.add(line(X0, V1, X1 + 10, V1, C.ink, 1.5), line(X0, V0, X0, V1, C.ink, 1.5), line(X0, V0 + 30, X1, V0 + 30, C.shade2, 1))
  const vu = []
  const vd = []
  for (const [i, k] of cs.entries()) {
    const x = X0 + sp * (i + 0.5)
    const h = k.vol * (V1 - V0 - 14)
    ;(k.c >= k.o ? vu : vd).push([x - bw / 2, V1 - h, bw, h])
  }
  S.add(path(rectsD(vu), { fill: C.em3 }), path(rectsD(vd), { fill: C.shade2 }))
  return S
}

/* ------------------------------------------------------------ meeting table */
function meetingTable() {
  const S = new Scene(W, H, 909)
  S.add(rect(0, 0, W, H, C.shade))
  S.add(rect(0, 0, W, H, gridPat(S, { color: C.shade2, size: 100, sw: 1.2 })))
  // rug
  S.add(rect(70, 130, 1060, 540, C.em4), rect(86, 146, 1028, 508, 'none', { stroke: C.em3, 'stroke-width': 1.5 }))
  const TX = 170
  const TY = 240
  const TW = 860
  const TH = 320
  // chair (top-down), local origin = seat centre, table is toward -y
  const chair = (x, y, rot) =>
    g(
      [
        rect(-40, 22, 80, 20, C.ink, { rx: 9 }),
        rect(-34, -28, 68, 58, C.em, { rx: 12 }),
        rect(-44, -20, 10, 46, C.ink, { rx: 5 }),
        rect(34, -20, 10, 46, C.ink, { rx: 5 }),
        line(-22, 14, 22, 14, C.em2, 1.2),
      ],
      { transform: `translate(${f(x)} ${f(y)}) rotate(${rot})` },
    )
  const seats = []
  for (const x of [330, 510, 690, 870]) {
    seats.push([x, TY + TH + 26, 0])
    seats.push([x, TY - 26, 180])
  }
  seats.push([TX - 26, TY + TH / 2, 90], [TX + TW + 26, TY + TH / 2, -90])
  S.add(seats.map(([x, y, r]) => chair(x, y, r)))
  // table top
  S.add(rect(TX, TY, TW, TH, C.em, { rx: 160 }))
  S.add(rect(TX + 12, TY + 12, TW - 24, TH - 24, 'none', { rx: 148, stroke: C.em2, 'stroke-width': 1.5 }))
  // keyboard texture: rows of keys
  const kid = S.id('k')
  S.def(`<pattern id="${kid}" patternUnits="userSpaceOnUse" width="9" height="8">${rect(0.5, 0.5, 7, 6, C.ink, { rx: 1 })}</pattern>`)
  // per-seat kit in seat-local coordinates; the table edge is at y = -26
  const laptop = (dx) => [
    rect(dx - 50, -132, 100, 64, C.shade2, { rx: 5 }),
    rect(dx - 44, -126, 88, 32, `url(#${kid})`),
    rect(dx - 16, -88, 32, 15, C.paper, { rx: 2 }),
    rect(dx - 52, -142, 104, 10, C.ink, { rx: 3 }),
  ]
  const papers = (dx, rot) =>
    g(
      [
        rect(-26, -38, 58, 80, C.shade),
        rect(-30, -42, 58, 80, C.paper),
        rect(-22, -34, 26, 4, C.ink),
        path(segsD([[-22, -22, 20, -22], [-22, -14, 16, -14], [-22, -6, 20, -6], [-22, 2, 8, 2], [-22, 12, 20, 12], [-22, 20, 14, 20]]), hair(C.em3, 1.5)),
      ],
      { transform: `translate(${dx} -92) rotate(${rot})` },
    )
  const cup = (dx, dy = -60) => [circ(dx, dy, 17, C.shade2), circ(dx, dy, 12, C.paper), circ(dx, dy, 8, C.ink), rect(dx + 11, dy - 3, 9, 6, C.paper, { rx: 2 })]
  const pen = (dx, rot, col = C.ink) => rect(dx - 2.5, -128, 5, 58, col, { rx: 2.5, transform: `rotate(${rot} ${dx} -99)` })
  const kits = [
    () => [laptop(-12), cup(66)],
    () => [papers(-18, -5), pen(32, 10), cup(-70)],
    () => [laptop(-24), papers(66, 6)],
    () => [papers(4, 4), cup(62), pen(-44, -8)],
  ]
  seats.slice(0, 8).forEach(([x, y, r], i) => {
    S.add(g(kits[[0, 3, 1, 2, 2, 0, 3, 1][i]](), { transform: `translate(${x} ${y}) rotate(${r})` }))
  })
  // head of the table: document with the brass pen; foot: laptop
  S.add(g([papers(0, 0), pen(40, -16, C.brass)], { transform: `translate(${TX - 26} ${TY + TH / 2}) rotate(90)` }))
  S.add(g([laptop(0)], { transform: `translate(${TX + TW + 26} ${TY + TH / 2}) rotate(-90)` }))
  // centre line: tray with carafe and glasses, a phone, a closed folder
  S.add(rect(552, 372, 96, 56, C.em2, { rx: 10 }))
  S.add(circ(580, 400, 18, C.em4), circ(580, 400, 10, C.paper), circ(614, 390, 9, C.em4, { stroke: C.paper, 'stroke-width': 2 }), circ(630, 412, 9, C.em4, { stroke: C.paper, 'stroke-width': 2 }))
  S.add(rect(410, 380, 20, 40, C.ink, { rx: 5, transform: 'rotate(14 420 400)' }), rect(414, 386, 12, 26, C.em3, { rx: 2, transform: 'rotate(14 420 400)' }))
  S.add(rect(752, 372, 64, 48, C.ink, { rx: 3, transform: 'rotate(-8 784 396)' }), rect(756, 376, 56, 40, C.em3, { rx: 2, transform: 'rotate(-8 784 396)' }), line(762, 400, 806, 394, C.em, 1.5))
  return S
}

/* ----------------------------------------------------------------- signing */
function signing() {
  const S = new Scene(W, H, 1010)
  S.add(rect(0, 0, W, H, C.em))
  S.add(rect(0, 0, W, H, hatch(S, { color: C.em2, gap: 6, angle: 30, sw: 0.8 })))
  // desk pad edge
  S.add(rect(150, -20, 900, 860, C.ink), rect(162, -20, 876, 860, C.em2))
  S.add(rect(162, -20, 876, 860, hatch(S, { color: C.em, gap: 5, angle: 90, sw: 0.6 })))
  // pages
  const docC = [600, 400]
  const rotD = -5
  S.add(g(rect(-220, -290, 440, 580, C.shade), { transform: `translate(${docC[0] - 30} ${docC[1] + 16}) rotate(4)` }))
  S.add(g(path(segsD(Array.from({ length: 14 }, (_, i) => [-170, -200 + i * 30, 160, -200 + i * 30])), hair(C.shade2, 2)), { transform: `translate(${docC[0] - 30} ${docC[1] + 16}) rotate(4)` }))
  const lines = []
  const widths = [300, 330, 310, 200, 330, 320, 330, 150, 330, 300, 320, 250]
  for (let i = 0; i < widths.length; i++) lines.push([-165, -168 + i * 24 + (i > 3 ? 14 : 0) + (i > 7 ? 14 : 0), -165 + widths[i], -168 + i * 24 + (i > 3 ? 14 : 0) + (i > 7 ? 14 : 0)])
  const doc = [
    rect(-220, -290, 440, 580, C.paper),
    rect(-165, -246, 150, 9, C.ink),
    rect(-165, -226, 90, 5, C.em),
    rect(105, -246, 60, 30, 'none', { stroke: C.em3, 'stroke-width': 1.5 }),
    path(segsD(lines), hair(C.em3, 2.2)),
    line(-165, 210, -25, 210, C.ink, 1.5),
    line(25, 210, 165, 210, C.ink, 1.5),
    circ(-95, 196, 34, 'none', { stroke: C.em2, 'stroke-width': 2 }),
    circ(-95, 196, 26, 'none', { stroke: C.em2, 'stroke-width': 1 }),
    circ(-95, 196, 8, C.em2),
    path(d`M40 205C52 168 70 160 72 180C74 200 60 214 78 196C92 182 98 168 104 186C108 200 116 196 128 184`, { ...hair(C.ink, 2.5), 'stroke-linecap': 'round' }),
  ]
  S.add(g(doc, { transform: `translate(${docC[0]} ${docC[1]}) rotate(${rotD})` }))
  const tip = rotP(docC[0] + 128, docC[1] + 184, docC[0], docC[1], rotD)
  // glasses and cup on the desk
  S.add(g([circ(-42, 0, 34, 'none', { stroke: C.ink, 'stroke-width': 6 }), circ(42, 0, 34, 'none', { stroke: C.ink, 'stroke-width': 6 }), path('M-8 -4Q0 -12 8 -4', hair(C.ink, 5)), line(-76, -6, -150, -30, C.ink, 5), line(76, -6, 150, -30, C.ink, 5)], { transform: 'translate(1000 150) rotate(18)' }))
  S.add(circ(250, 120, 58, C.shade2), circ(250, 120, 44, C.paper), circ(250, 120, 34, C.ink), rect(290, 110, 30, 20, C.paper, { rx: 6 }))
  // left hand resting on the page (from the left edge)
  S.add(
    g(
      [
        rect(-260, -60, 240, 120, C.ink),
        rect(-36, -64, 30, 128, C.paper),
        rect(-10, -58, 130, 116, C.shade2, { rx: 46 }),
        rect(80, -62, 120, 26, C.shade2, { rx: 13 }),
        rect(90, -32, 128, 26, C.shade2, { rx: 13 }),
        rect(92, -2, 120, 26, C.shade2, { rx: 13 }),
        rect(84, 28, 96, 24, C.shade2, { rx: 12 }),
        rect(20, -112, 90, 30, C.shade2, { rx: 15, transform: 'rotate(28 20 -97)' }),
        path('M84 -36H150M92 -6H160M92 24H150', hair(C.ink, 1)),
      ],
      { transform: 'translate(200 330) rotate(14)' },
    ),
  )
  // right hand with pen (from the lower right)
  const ang = -38
  const a = (ang * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const len = 250
  const pe = [tip[0] + ux * len, tip[1] + uy * len]
  S.add(
    path(d`M${tip[0]} ${tip[1]}L${tip[0] + ux * 26 - uy * 6} ${tip[1] + uy * 26 + ux * 6}L${tip[0] + ux * 26 + uy * 6} ${tip[1] + uy * 26 - ux * 6}Z`, { fill: C.ink }),
    line(tip[0] + ux * 24, tip[1] + uy * 24, pe[0], pe[1], C.ink, 13, { 'stroke-linecap': 'round' }),
    line(tip[0] + ux * 26, tip[1] + uy * 26, tip[0] + ux * 48, tip[1] + uy * 48, C.brass, 13),
    line(pe[0] - ux * 70 + uy * 9, pe[1] - uy * 70 - ux * 9, pe[0] - ux * 10 + uy * 9, pe[1] - uy * 10 - ux * 9, C.brass, 3, { 'stroke-linecap': 'round' }),
  )
  const hx = tip[0] + ux * 96 + 36
  const hy = tip[1] + uy * 96 + 46
  S.add(
    g(
      [
        rect(60, -70, 400, 150, C.ink),
        rect(40, -74, 30, 156, C.paper),
        rect(-80, -64, 132, 128, C.shade2, { rx: 54 }),
        rect(-112, -26, 70, 30, C.shade2, { rx: 15 }),
        rect(-104, 6, 68, 28, C.shade2, { rx: 14 }),
        rect(-92, 36, 60, 26, C.shade2, { rx: 13 }),
        path('M-44 -10H-10M-38 20H-6M-30 48H-4', hair(C.ink, 1)),
      ],
      { transform: `translate(${f(hx)} ${f(hy)}) rotate(28)` },
    ),
  )
  // thumb over the pen
  S.add(g(rect(-60, -16, 96, 30, C.shade2, { rx: 15, stroke: C.ink, 'stroke-width': 1 }), { transform: `translate(${f(tip[0] + ux * 92)} ${f(tip[1] + uy * 92 - 14)}) rotate(${ang + 8})` }))
  return S
}

/* ---------------------------------------------------------------- workshop */
function workshop() {
  const S = new Scene(W, H, 1111)
  const FY = 630
  S.add(rect(0, 0, W, H, C.shade))
  // sawtooth roof structure
  S.add(rect(0, 0, W, 110, C.em4))
  const saw = []
  for (let x = 0; x <= W; x += 150) saw.push([x, 110], [x + 150, 30])
  const tooth = []
  for (let x = -150; x < W; x += 150) tooth.push(poly([[x, 110], [x + 150, 34], [x + 150, 110]], C.paper))
  S.add(tooth)
  const truss = []
  for (let x = -150; x < W; x += 150) {
    truss.push([x, 110, x + 150, 34], [x + 150, 34, x + 150, 110])
    truss.push([x + 50, 110, x + 50, 85], [x + 100, 110, x + 100, 59], [x + 50, 85, x + 100, 110], [x + 100, 59, x + 150, 110])
  }
  S.add(path(segsD(truss), hair(C.ink, 1.5)))
  S.add(rect(0, 110, W, 12, C.ink))
  // back wall with industrial windows
  S.add(rect(0, 122, W, FY - 122, C.shade))
  S.add(rect(0, 470, W, FY - 470, C.shade2))
  for (const x of [60, 440, 820]) {
    S.add(rect(x, 170, 320, 200, C.em4), winFill(S, x, 170, 320, 200, { kind: 'mullion', color: C.ink, cw: 40, fh: 40, sw: 2 }), rect(x - 6, 164, 332, 212, 'none', { stroke: C.ink, 'stroke-width': 3 }))
    S.add(poly([[x + 150, 172], [x + 190, 172], [x + 70, 368], [x + 30, 368]], C.paper), poly([[x + 206, 172], [x + 218, 172], [x + 98, 368], [x + 86, 368]], C.paper))
    S.add(winFill(S, x, 170, 320, 200, { kind: 'mullion', color: C.ink, cw: 40, fh: 40, sw: 2 }))
  }
  // overhead lamps with brass lamps
  for (const x of [250, 630, 1010]) S.add(line(x, 122, x, 230, C.ink, 1.2), poly([[x - 34, 262], [x - 14, 230], [x + 14, 230], [x + 34, 262]], C.ink), rect(x - 14, 262, 28, 6, C.brass))
  // pegboard with tools (right)
  S.add(rect(1040, 400, 140, 160, C.em4), rect(1040, 400, 140, 160, dots(S, { color: C.em3, gap: 12, r: 1.4 })))
  S.add(line(1070, 420, 1070, 500, C.ink, 5, { 'stroke-linecap': 'round' }), circ(1070, 420, 9, 'none', { stroke: C.ink, 'stroke-width': 4 }))
  S.add(rect(1100, 420, 34, 12, C.ink), rect(1113, 432, 8, 70, C.em))
  S.add(line(1150, 418, 1150, 506, C.ink, 3), rect(1144, 470, 12, 40, C.em2))
  // lathe
  S.add(
    rect(100, 520, 90, FY - 520, C.em), rect(380, 520, 90, FY - 520, C.em),
    rect(100, 540, 90, 4, C.em2), rect(380, 540, 90, 4, C.em2),
    rect(92, 488, 390, 32, C.em2), line(92, 504, 482, 504, C.em, 1.5),
    rect(100, 400, 110, 88, C.em), rect(110, 412, 50, 30, C.em2),
    circ(226, 444, 30, C.ink), circ(226, 444, 12, C.em3), line(226, 414, 226, 426, C.em3, 4), line(226, 462, 226, 474, C.em3, 4),
    rect(256, 438, 120, 12, C.em3),
    rect(300, 460, 50, 28, C.ink), rect(312, 446, 30, 14, C.em),
    rect(400, 424, 60, 64, C.em), rect(376, 438, 24, 12, C.em3),
  )
  // drill press
  S.add(
    rect(560, 606, 120, 24, C.ink), rect(606, 330, 16, 276, C.em2),
    rect(566, 330, 116, 60, C.em), rect(574, 312, 60, 18, C.ink),
    rect(611, 390, 8, 52, C.ink), poly([[611, 442], [619, 442], [615, 458]], C.ink),
    rect(576, 490, 92, 12, C.em), rect(608, 502, 14, 30, C.em),
    line(682, 360, 720, 330, C.ink, 3), line(682, 360, 724, 380, C.ink, 3), circ(720, 330, 6, C.ink), circ(724, 380, 6, C.ink),
  )
  // CNC cabinet with control pendant and stack light
  S.add(
    rect(770, 380, 250, FY - 380, C.em), rect(770, 380, 250, 18, C.ink),
    rect(800, 418, 150, 120, C.em4), rect(800, 418, 150, 120, hatch(S, { color: C.em3, gap: 10, angle: 45 })),
    rect(800, 418, 150, 120, 'none', { stroke: C.ink, 'stroke-width': 4 }),
    line(875, 418, 875, 538, C.ink, 2), rect(864, 466, 4, 24, C.ink), rect(882, 466, 4, 24, C.ink),
    rect(770, 572, 250, 8, C.em2),
    rect(1028, 420, 48, 110, C.ink), rect(1034, 428, 36, 30, C.em3),
    path([1038, 1050, 1062].flatMap((x) => [470, 486, 502].map((y) => d`M${x} ${y}h0`)).join(''), { stroke: C.em4, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    rect(976, 344, 10, 36, C.ink), rect(974, 326, 14, 18, C.em3),
  )
  // floor
  S.add(rect(0, FY, W, H - FY, C.shade2), line(0, FY, W, FY, C.ink, 2))
  S.add(rect(0, FY + 20, W, H - FY - 20, hatch(S, { color: C.shade, gap: 12, angle: 90, sw: 1.2 })))
  S.add(line(0, 700, W, 700, C.em3, 4, { 'stroke-dasharray': '60 30' }))
  // crates on a pallet
  S.add(rect(30, 740, 220, 14, C.em), rect(40, 650, 90, 90, C.shade, { stroke: C.ink, 'stroke-width': 1.5 }), rect(140, 680, 100, 60, C.shade, { stroke: C.ink, 'stroke-width': 1.5 }), line(40, 695, 130, 695, C.shade2, 6), line(140, 710, 240, 710, C.shade2, 6))
  return S
}

/* -------------------------------------------------------------- agri field */
function agriField() {
  // Aerial farmland on a rotated cadastral grid. Read at card size relies on
  // three cues: furrowed field stripes, a water canal lined with tree crowns,
  // and one brass tractor ploughing a half-finished field (the focal point).
  const S = new Scene(W, H, 1212)
  S.add(rect(0, 0, W, H, C.shade))
  const T = (fill, color, angle, gap, sw) => ({ fill, pat: hatch(S, { color, gap, angle, sw }) })
  const textures = [
    T(C.em2, C.em, 0, 12, 4),
    T(C.em4, C.em3, 90, 10, 3),
    T(C.shade2, C.shade, 0, 10, 2.4),
    T(C.em3, C.em2, 0, 11, 3.4),
    T(C.em4, C.paper, 0, 12, 3),
    T(C.shade2, C.em4, 90, 12, 2),
    T(C.em, C.em2, 90, 13, 3.4),
  ]
  const colsX = [-300, -40, 220, 470, 560, 820, 1080, 1340, 1600]
  const rowsY = [-300, -60, 200, 420, 640, 900, 1160]
  const PLOUGH = [4, 3] // column, row of the field being ploughed
  const YARD = [5, 2] // farmstead plot
  const fields = []
  let k = 0
  for (let i = 0; i < colsX.length - 1; i++) {
    if (i === 3) continue // main canal corridor
    for (let j = 0; j < rowsY.length - 1; j++) {
      const x0 = colsX[i] + 8
      const x1 = colsX[i + 1] - 8
      const y0 = rowsY[j] + 8
      const y1 = rowsY[j + 1] - 8
      if (i === PLOUGH[0] && j === PLOUGH[1]) continue
      if (i === YARD[0] && j === YARD[1]) {
        fields.push(rect(x0, y0, x1 - x0, y1 - y0, C.shade2))
        continue
      }
      const split = (i + j) % 3 === 0
      const parts = split ? [[x0, y0, (x0 + x1) / 2 - 4, y1], [(x0 + x1) / 2 + 4, y0, x1, y1]] : [[x0, y0, x1, y1]]
      for (const [a, b, c, e] of parts) {
        const t = textures[(k * 3 + j) % textures.length]
        k += 1
        fields.push(rect(a, b, c - a, e - b, t.fill), rect(a, b, c - a, e - b, t.pat))
      }
    }
  }
  // field being ploughed: finished strips dark, stubble light, tractor at the edge
  const px0 = colsX[PLOUGH[0]] + 8
  const px1 = colsX[PLOUGH[0] + 1] - 8
  const py0 = rowsY[PLOUGH[1]] + 8
  const py1 = rowsY[PLOUGH[1] + 1] - 8
  const bx = 708 // tractor centre line
  const ty = 498 // tractor centre
  const done = hatch(S, { color: C.em, gap: 10, angle: 0, sw: 3 })
  const stubble = hatch(S, { color: C.em3, gap: 8, angle: 0, sw: 1.2 })
  fields.push(
    rect(px0, py0, px1 - px0, py1 - py0, C.em4), rect(px0, py0, px1 - px0, py1 - py0, stubble),
    rect(px0, py0, bx - 30 - px0, py1 - py0, C.ink), rect(px0, py0, bx - 30 - px0, py1 - py0, done),
    rect(bx - 30, ty + 66, 60, py1 - ty - 66, C.ink), rect(bx - 30, ty + 66, 60, py1 - ty - 66, done),
  )
  const tractor = [
    line(bx, ty + 40, bx, ty + 64, C.ink, 4),
    rect(bx - 36, ty + 62, 72, 12, C.ink, { rx: 2, stroke: C.em4, 'stroke-width': 2 }),
    path(segsD([[bx - 28, ty + 74, bx - 22, ty + 84], [bx - 10, ty + 74, bx - 4, ty + 84], [bx + 8, ty + 74, bx + 14, ty + 84], [bx + 26, ty + 74, bx + 32, ty + 84]]), hair(C.ink, 3)),
    rect(bx - 34, ty + 2, 17, 40, C.ink, { stroke: C.em4, 'stroke-width': 2, rx: 4 }),
    rect(bx + 17, ty + 2, 17, 40, C.ink, { stroke: C.em4, 'stroke-width': 2, rx: 4 }),
    rect(bx - 28, ty - 50, 12, 24, C.ink, { stroke: C.em4, 'stroke-width': 2, rx: 3 }),
    rect(bx + 16, ty - 50, 12, 24, C.ink, { stroke: C.em4, 'stroke-width': 2, rx: 3 }),
    rect(bx - 15, ty - 58, 30, 66, C.brass, { rx: 6 }),
    rect(bx - 21, ty - 2, 42, 40, C.paper, { rx: 4, stroke: C.ink, 'stroke-width': 2 }),
    line(bx - 9, ty - 52, bx - 9, ty - 10, C.ink, 1.2),
    line(bx + 9, ty - 52, bx + 9, ty - 10, C.ink, 1.2),
  ]
  // irrigation channels and field tracks between plots
  const ch = []
  for (const y of rowsY) ch.push(rect(-400, y - 3, 2200, 6, C.em2))
  for (const x of colsX) if (x !== 470 && x !== 560) ch.push(rect(x - 2, -400, 4, 1700, C.em3))
  // main canal: banks, water, flow lines
  const canal = [
    rect(474, -400, 82, 1700, C.shade),
    rect(496, -400, 38, 1700, C.em3),
    path(segsD(Array.from({ length: 40 }, (_, i) => [506 + (i % 3) * 9, -380 + i * 42, 506 + (i % 3) * 9, -356 + i * 42])), hair(C.em4, 2)),
  ]
  // tree crowns along both banks (round, two-tone, jittered)
  const trees = []
  for (let y = -380; y < 1300; y += 34) {
    for (const [x0, off] of [[482, 0], [548, 17]]) {
      const r = 12 + S.r() * 3
      const x = x0 + S.r(-2, 2)
      const yy = y + off + S.r(-3, 3)
      trees.push(circ(x, yy, r, C.em), circ(x - r * 0.3, yy - r * 0.3, r * 0.45, C.em2))
    }
  }
  // farm road
  const road = [rect(1070, -400, 22, 1700, C.paper), line(1081, -400, 1081, 1300, C.shade2, 2, { 'stroke-dasharray': '12 12' })]
  // farmstead: gable roofs seen from above (two tones split at the ridge)
  const roof = (x, y, w, h, a, b) => [rect(x, y, w, h / 2, a), rect(x, y + h / 2, w, h / 2, b), line(x, y + h / 2, x + w, y + h / 2, C.ink, 2), rect(x, y, w, h, 'none', { stroke: C.ink, 'stroke-width': 1.5 })]
  const farm = [
    rect(836, 236, 180, 8, C.paper),
    ...roof(846, 258, 168, 58, C.em3, C.em2),
    ...roof(846, 334, 88, 52, C.paper, C.shade),
    ...roof(950, 334, 64, 52, C.em4, C.em3),
    circ(1042, 262, 16, C.em), circ(1038, 258, 7, C.em2),
    circ(1046, 300, 13, C.em), circ(1042, 296, 6, C.em2),
    circ(1040, 382, 15, C.em), circ(1036, 378, 7, C.em2),
  ]
  S.add(g([...fields, ...ch, ...canal, ...trees, ...road, ...farm, ...tractor], { transform: 'rotate(-14 600 400)' }))
  return S
}

/* --------------------------------------------------------------- containers */
function containers() {
  const S = new Scene(W, H, 1313)
  const GY = 650
  S.add(rect(0, 0, W, H, C.paper))
  // distant warehouses
  S.add(path(rectsD([[0, 520, 420, 130], [700, 500, 500, 150]]), { fill: C.em4 }))
  const st = []
  for (let x = 0; x < 420; x += 60) st.push(poly([[x, 520], [x + 60, 490], [x + 60, 520]], C.em4))
  for (let x = 700; x < 1200; x += 60) st.push(poly([[x, 500], [x + 60, 470], [x + 60, 500]], C.em4))
  S.add(st)
  // container drawing helpers with ribbed sides
  const ribs = {}
  const ribPat = (col) => {
    const map = { [C.em]: C.em2, [C.em2]: C.em, [C.em3]: C.em2, [C.ink]: C.em, [C.shade2]: C.paper, [C.brass]: C.shade2, [C.em4]: C.em3 }
    if (!ribs[col]) ribs[col] = hatch(S, { color: map[col], gap: 7, angle: 0, sw: 1.4 })
    return ribs[col]
  }
  const box = (x, y, w, col) => [
    rect(x, y, w, 64, col),
    rect(x + 6, y + 6, w - 12, 52, ribPat(col)),
    path(segsD([[x + w - 22, y + 8, x + w - 22, y + 56], [x + w - 34, y + 8, x + w - 34, y + 56]]), hair(C.ink, 2)),
    rect(x + w - 26, y + 28, 8, 4, C.ink),
    rect(x, y, w, 5, C.ink),
    rect(x, y + 59, w, 5, C.ink),
    rect(x, y, 6, 64, C.ink),
    rect(x + w - 6, y, 6, 64, C.ink),
  ]
  const palette = [C.em, C.em2, C.em3, C.ink, C.shade2, C.em, C.em4, C.em2]
  const stacks = [
    [40, 3, 200], [250, 4, 200], [460, 2, 200], [670, 4, 100], [780, 3, 200], [990, 4, 200],
  ]
  let n = 0
  for (const [x, hgt, w] of stacks) {
    for (let j = 0; j < hgt; j++) {
      const col = x === 780 && j === 2 ? C.brass : palette[(n * 3 + j) % palette.length]
      n += 1
      S.add(box(x, GY - 64 * (j + 1), w, col))
    }
  }
  // rail-mounted gantry crane
  const L = 20
  const R = 1180
  S.add(
    rect(L - 10, 130, R - L + 20, 36, C.ink),
    path(segsD(Array.from({ length: 29 }, (_, i) => [L + i * 40, 166, L + i * 40 + 20, 130])), hair(C.em2, 1.5)),
    rect(L - 10, 136, R - L + 20, 4, C.em),
    rect(L, 166, 34, GY - 166, C.ink), rect(R - 34, 166, 34, GY - 166, C.ink),
    line(L + 34, 200, L + 120, 166, C.ink, 5), line(R - 34, 200, R - 120, 166, C.ink, 5),
    rect(L - 24, GY - 22, 62, 22, C.em), rect(R - 38, GY - 22, 62, 22, C.em),
    circ(L - 10, GY - 2, 6, C.ink), circ(L + 24, GY - 2, 6, C.ink), circ(R - 24, GY - 2, 6, C.ink), circ(R + 10, GY - 2, 6, C.ink),
    rect(L + 44, 240, 70, 60, C.em2), rect(L + 54, 250, 50, 24, C.em4),
  )
  // trolley, hoist ropes, spreader and lifted container
  const tx = 640
  S.add(
    rect(tx - 60, 108, 120, 22, C.em), rect(tx - 40, 166, 80, 30, C.em), rect(tx - 30, 172, 26, 16, C.em4),
    line(tx - 50, 196, tx - 70, 300, C.ink, 1.5), line(tx + 50, 196, tx + 70, 300, C.ink, 1.5),
    line(tx - 10, 196, tx - 30, 300, C.ink, 1.5), line(tx + 10, 196, tx + 30, 300, C.ink, 1.5),
    rect(tx - 104, 300, 208, 12, C.ink),
  )
  S.add(box(tx - 100, 312, 200, C.em3))
  // ground: rails and paving
  S.add(rect(0, GY, W, H - GY, C.shade), line(0, GY, W, GY, C.ink, 2), line(0, GY + 8, W, GY + 8, C.ink, 1))
  S.add(rect(0, GY + 30, W, H - GY - 30, gridPat(S, { color: C.shade2, size: 60, y: GY + 30 })))
  S.add(line(0, 740, W, 740, C.paper, 4, { 'stroke-dasharray': '40 30' }))
  return S
}

/* ------------------------------------------------------------- construction */
function construction() {
  const S = new Scene(W, H, 1414)
  const GY = 660
  S.add(rect(0, 0, W, H, C.paper))
  // neighbouring buildings
  S.add(tower(S, { x: 860, w: 140, top: 360, base: GY, fill: C.em4, win: { kind: 'grid', color: C.paper, cols: 5, gx: 8, gy: 10, fh: 26 } }))
  S.add(tower(S, { x: 1010, w: 170, top: 300, base: GY, fill: C.em4, win: { kind: 'bands', color: C.paper, fh: 18, ratio: 0.4 } }))
  S.add(tower(S, { x: 20, w: 150, top: 420, base: GY, fill: C.shade2, win: { kind: 'grid', color: C.em4, cols: 5, gx: 8, gy: 10, fh: 26 } }))
  // frame building: concrete frame, lower floors glazed
  const BX = 210
  const BW = 450
  const FH = 58
  const floors = 7
  const top = GY - FH * floors
  const colsX = []
  for (let i = 0; i <= 6; i++) colsX.push(BX + (BW * i) / 6)
  for (let fl = 0; fl < floors; fl++) {
    const y = GY - FH * (fl + 1)
    if (fl < 3) S.add(rect(BX, y, BW, FH, C.em3), winFill(S, BX, y + 10, BW, FH - 10, { kind: 'mullion', color: C.em4, cw: 25, fh: 200, sw: 1.2 }))
    else if (fl < 5) S.add(rect(BX, y, BW, FH, C.em4), rect(BX, y, BW, FH, hatch(S, { color: C.em3, gap: 10, angle: 45, sw: 1 })))
    else S.add(rect(BX, y, BW, FH, C.shade))
  }
  for (const x of colsX) S.add(rect(x - 5, top, 10, GY - top, C.ink))
  for (let fl = 0; fl <= floors; fl++) S.add(rect(BX - 10, GY - FH * fl - 8, BW + 20, 10, fl === 0 ? C.ink : C.em))
  // top storey: rebar starters
  const reb = []
  for (const x of colsX) reb.push([x - 3, top - 8, x - 3, top - 30], [x + 3, top - 8, x + 3, top - 26])
  S.add(path(segsD(reb), hair(C.ink, 1.2)))
  // scaffold on the left face
  const sc = []
  for (let y = GY; y >= top; y -= FH / 2) sc.push([BX - 50, y, BX - 12, y])
  for (const x of [BX - 50, BX - 30, BX - 12]) sc.push([x, top - 10, x, GY])
  for (let y = GY; y > top; y -= FH) sc.push([BX - 50, y, BX - 12, y - FH / 2], [BX - 12, y - FH / 2, BX - 50, y - FH])
  S.add(path(segsD(sc), hair(C.ink, 1.3)))
  // tower crane
  const MX = 760
  const MW = 26
  const JY = 120
  const mast = []
  for (let y = GY; y > JY + 30; y -= 26) mast.push([MX, y, MX + MW, y - 26], [MX, y - 26, MX + MW, y - 26])
  S.add(rect(MX - 2, JY + 30, 4, GY - JY - 30, C.ink), rect(MX + MW - 2, JY + 30, 4, GY - JY - 30, C.ink), path(segsD(mast), hair(C.ink, 1.3)))
  S.add(rect(MX - 30, GY - 20, MW + 60, 20, C.ink))
  // slewing unit, cab
  S.add(rect(MX - 8, JY + 12, MW + 16, 22, C.ink), rect(MX + MW + 4, JY + 30, 34, 34, C.em2), rect(MX + MW + 10, JY + 36, 22, 16, C.em4))
  // jib (to the left) and counter-jib (to the right)
  const J0 = 150
  const J1 = 1060
  const jib = []
  for (let x = J0; x < MX; x += 30) jib.push([x, JY + 12, x + 15, JY - 6], [x + 15, JY - 6, x + 30, JY + 12])
  S.add(line(J0, JY + 12, MX, JY + 12, C.ink, 3), line(J0 + 15, JY - 6, MX, JY - 6, C.ink, 2), path(segsD(jib), hair(C.ink, 1.3)))
  S.add(rect(MX + MW, JY + 4, J1 - MX - MW, 10, C.ink), path(segsD(Array.from({ length: 9 }, (_, i) => [MX + MW + 10 + i * 30, JY + 4, MX + MW + 25 + i * 30, JY + 14])), hair(C.em3, 1.5)))
  S.add(rect(J1 - 110, JY + 14, 46, 40, C.em), rect(J1 - 60, JY + 14, 46, 40, C.em), line(J1 - 64, JY + 14, J1 - 64, JY + 54, C.paper, 1.5))
  // apex and pendant ties
  S.add(poly([[MX - 4, JY + 12], [MX + MW / 2, 36], [MX + MW + 4, JY + 12]], 'none', { stroke: C.ink, 'stroke-width': 3 }))
  S.add(line(MX + MW / 2, 36, J0 + 120, JY - 6, C.ink, 1.2), line(MX + MW / 2, 36, J1 - 30, JY + 4, C.ink, 1.2))
  // trolley, hook, brass load (steel beam)
  const TX = 360
  S.add(rect(TX - 16, JY + 12, 32, 10, C.ink), line(TX - 4, JY + 22, TX - 4, 330, C.ink, 1.2), line(TX + 4, JY + 22, TX + 4, 330, C.ink, 1.2), rect(TX - 10, 330, 20, 16, C.ink))
  S.add(line(TX, 346, TX - 70, 380, C.ink, 1.2), line(TX, 346, TX + 70, 380, C.ink, 1.2))
  S.add(rect(TX - 110, 380, 220, 14, C.brass), rect(TX - 110, 384, 220, 6, C.ink))
  // site hoarding and cabins
  S.add(rect(0, GY - 46, 700, 46, C.em2), winFill(S, 0, GY - 46, 700, 46, { kind: 'fins', color: C.em, cw: 70, fh: 46, ratio: 0.03 }), line(0, GY - 46, 700, GY - 46, C.ink, 1.5))
  S.add(rect(900, GY - 54, 120, 54, C.shade2, { stroke: C.ink, 'stroke-width': 1.5 }), rect(916, GY - 40, 40, 20, C.em3), rect(1030, GY - 108, 120, 54, C.shade2, { stroke: C.ink, 'stroke-width': 1.5 }), rect(1030, GY - 54, 120, 54, C.em3, { stroke: C.ink, 'stroke-width': 1.5 }), rect(1046, GY - 94, 40, 20, C.em4))
  // pipe bundle
  S.add([[1180, GY - 10], [1160, GY - 10], [1170, GY - 27]].map(([x, y]) => [circ(x, y, 10, C.em), circ(x, y, 5, C.paper)]))
  // ground
  S.add(rect(0, GY, W, H - GY, C.shade2), line(0, GY, W, GY, C.ink, 2), rect(0, GY + 2, W, H - GY, hatch(S, { color: C.shade, gap: 9, angle: 60, sw: 1.4 })))
  return S
}

/* ----------------------------------------------------------------- vehicles */
function vehicles() {
  const S = new Scene(W, H, 1515)
  const GY = 640
  S.add(rect(0, 0, W, H, C.paper))
  // poplars behind the depot
  for (const [x, top, w, col] of [[90, 120, 22, C.em3], [126, 160, 18, C.em4], [1010, 110, 22, C.em3], [1046, 150, 18, C.em4], [1082, 130, 20, C.em3]]) {
    S.add(path(d`M${x} ${top}C${x + w} ${top + 70} ${x + w} ${230} ${x} ${280}C${x - w} ${230} ${x - w} ${top + 70} ${x} ${top}Z`, { fill: col }))
  }
  // depot shed with roller doors
  S.add(rect(0, 232, W, GY - 232, C.shade), rect(0, 224, W, 16, C.shade2), line(0, 240, W, 240, C.ink, 1.5))
  S.add(winFill(S, 30, 256, 1140, 34, { kind: 'grid', color: C.em4, cols: 19, gx: 12, gy: 0, fh: 34 }))
  const slats = hatch(S, { color: C.em3, gap: 9, angle: 90, sw: 1.2 })
  for (const x of [30, 420, 810]) {
    S.add(rect(x, 312, 360, GY - 312, C.em4), rect(x, 312, 360, GY - 312, slats), rect(x - 8, 304, 376, 10, C.ink), rect(x - 8, 304, 8, GY - 304, C.ink), rect(x + 360, 304, 8, GY - 304, C.ink))
  }
  const wheel = (x, y, r = 30) => [circ(x, y, r, C.ink), circ(x, y, r * 0.5, C.shade2), circ(x, y, r * 0.18, C.ink)]
  // box truck with the brass livery line
  const truck = (x0) => [
    rect(x0 + 6, GY - 66, 360, 16, C.ink),
    rect(x0, GY - 240, 252, 174, C.em),
    winFill(S, x0 + 8, GY - 232, 236, 158, { kind: 'fins', color: C.em2, cw: 26, fh: 158, ratio: 0.08 }),
    rect(x0, GY - 112, 252, 7, C.brass),
    path(d`M${x0 + 262} ${GY - 50}V${GY - 186}Q${x0 + 262} ${GY - 196} ${x0 + 272} ${GY - 196}H${x0 + 322}Q${x0 + 334} ${GY - 196} ${x0 + 342} ${GY - 182}L${x0 + 366} ${GY - 120}V${GY - 50}Z`, { fill: C.em2 }),
    poly([[x0 + 300, GY - 182], [x0 + 330, GY - 182], [x0 + 350, GY - 130], [x0 + 300, GY - 130]], C.em4),
    line(x0 + 292, GY - 182, x0 + 292, GY - 64, C.ink, 1.2),
    rect(x0 + 278, GY - 118, 12, 4, C.ink),
    rect(x0 + 354, GY - 104, 14, 10, C.shade),
    rect(x0 + 352, GY - 66, 22, 16, C.ink),
    rect(x0 + 270, GY - 168, 6, 34, C.ink),
    wheel(x0 + 70, GY - 30), wheel(x0 + 136, GY - 30), wheel(x0 + 312, GY - 30),
  ]
  // tipper
  const tipper = (x0) => [
    rect(x0 + 6, GY - 66, 350, 16, C.ink),
    poly([[x0, GY - 184], [x0 + 236, GY - 184], [x0 + 220, GY - 80], [x0 + 30, GY - 80]], C.ink),
    poly([[x0 + 12, GY - 174], [x0 + 224, GY - 174], [x0 + 212, GY - 90], [x0 + 38, GY - 90]], C.em3),
    path(segsD([[x0 + 76, GY - 174, x0 + 80, GY - 90], [x0 + 124, GY - 174, x0 + 126, GY - 90], [x0 + 172, GY - 174, x0 + 170, GY - 90]]), hair(C.em2, 2)),
    path(d`M${x0 + 252} ${GY - 50}V${GY - 196}Q${x0 + 252} ${GY - 206} ${x0 + 262} ${GY - 206}H${x0 + 330}Q${x0 + 344} ${GY - 206} ${x0 + 346} ${GY - 192}L${x0 + 356} ${GY - 120}V${GY - 50}Z`, { fill: C.em }),
    poly([[x0 + 296, GY - 194], [x0 + 336, GY - 194], [x0 + 344, GY - 136], [x0 + 296, GY - 136]], C.em4),
    line(x0 + 286, GY - 194, x0 + 286, GY - 64, C.ink, 1.2),
    rect(x0 + 344, GY - 66, 22, 16, C.ink),
    rect(x0 + 238, GY - 120, 14, 54, C.ink),
    wheel(x0 + 70, GY - 30), wheel(x0 + 136, GY - 30), wheel(x0 + 300, GY - 30),
  ]
  // tractor (agricultural equipment leasing)
  const tractor = (x0) => [
    rect(x0 + 130, GY - 150, 150, 62, C.em2, { rx: 8 }),
    rect(x0 + 270, GY - 146, 16, 54, C.em),
    path(segsD([[x0 + 274, GY - 136, x0 + 284, GY - 136], [x0 + 274, GY - 124, x0 + 284, GY - 124], [x0 + 274, GY - 112, x0 + 284, GY - 112]]), hair(C.em4, 2)),
    rect(x0 + 230, GY - 200, 9, 50, C.ink), rect(x0 + 227, GY - 206, 15, 8, C.ink),
    rect(x0 + 60, GY - 100, 230, 30, C.em),
    rect(x0 + 10, GY - 280, 150, 12, C.ink, { rx: 4 }),
    rect(x0 + 22, GY - 268, 126, 150, C.em4),
    rect(x0 + 22, GY - 268, 6, 168, C.ink), rect(x0 + 142, GY - 268, 6, 168, C.ink), line(x0 + 85, GY - 268, x0 + 85, GY - 118, C.em3, 2),
    rect(x0 + 22, GY - 118, 126, 18, C.em),
    path(d`M${x0 + 4} ${GY - 70}A76 76 0 0 1 ${x0 + 156} ${GY - 70}H${x0 + 140}A60 60 0 0 0 ${x0 + 20} ${GY - 70}Z`, { fill: C.em2 }),
    circ(x0 + 80, GY - 62, 62, C.ink),
    circ(x0 + 80, GY - 62, 56, 'none', { stroke: C.em, 'stroke-width': 6, 'stroke-dasharray': '8 9' }),
    circ(x0 + 80, GY - 62, 30, C.shade2), circ(x0 + 80, GY - 62, 10, C.ink),
    wheel(x0 + 244, GY - 36, 36),
  ]
  S.add(g([truck(18), tipper(420), tractor(830)], {}))
  // yard
  S.add(rect(0, GY, W, H - GY, C.shade2), line(0, GY, W, GY, C.ink, 2))
  S.add(rect(0, GY + 2, W, H - GY, hatch(S, { color: C.shade, gap: 10, angle: 90, sw: 1.4 })))
  S.add(path(segsD([[0, 700, W, 700], [0, 776, W, 776]]), hair(C.paper, 4)))
  for (let x = 100; x < W; x += 260) S.add(line(x, 700, x + 40, 776, C.paper, 4))
  return S
}

/* -------------------------------------------------------------------- globe */
const LAND = [
  // Africa
  [[-17, 21], [-16, 12], [-12, 7], [-8, 4], [5, 5], [9, 4], [10, -2], [13, -12], [12, -18], [15, -27], [19, -35], [26, -34], [33, -26], [35, -20], [40, -15], [40, -5], [44, -1], [51, 11], [43, 12], [38, 18], [33, 28], [32, 31], [20, 31], [10, 37], [0, 36], [-6, 35], [-10, 30], [-17, 21]],
  // Eurasia
  [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [0, 50], [5, 53], [8, 54], [9, 57], [6, 58], [5, 62], [14, 68], [25, 71], [40, 67], [55, 69], [70, 73], [80, 73], [100, 77], [112, 74], [130, 71], [140, 72], [160, 69], [180, 66], [180, 64], [170, 60], [163, 56], [156, 51], [143, 52], [140, 47], [135, 43], [129, 35], [127, 39], [125, 40], [122, 37], [121, 31], [119, 25], [110, 21], [108, 16], [109, 12], [105, 9], [101, 13], [103, 4], [104, 1], [100, 4], [98, 9], [97, 16], [94, 17], [92, 22], [88, 22], [86, 20], [80, 15], [77, 8], [73, 17], [72, 21], [67, 25], [62, 25], [57, 25], [56, 27], [51, 30], [48, 30], [50, 26], [51, 24], [56, 24], [59, 22], [55, 17], [52, 16], [45, 13], [43, 13], [39, 21], [35, 28], [34, 31], [36, 36], [30, 36], [27, 37], [26, 40], [23, 38], [20, 40], [18, 40], [16, 38], [12, 44], [8, 44], [3, 43], [0, 39], [-5, 36], [-9, 37]],
  // Britain
  [[-5, 50], [1, 51], [0, 53], [-2, 56], [-3, 58], [-6, 58], [-5, 55], [-3, 54], [-5, 50]],
  // Scandinavia interior seas are ignored at this resolution; Japan
  [[130, 31], [135, 34], [140, 35], [142, 40], [141, 45], [139, 41], [135, 36], [130, 31]],
  // Sumatra + Borneo + Java (coarse)
  [[95, 5], [98, 4], [104, -3], [106, -6], [101, -3], [95, 5]],
  [[109, 2], [117, 7], [119, 5], [117, -1], [114, -4], [110, -2], [109, 2]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -10], [146, -18], [153, -25], [151, -34], [145, -38], [138, -35], [131, -31], [124, -34], [115, -34], [114, -22]],
  // Madagascar
  [[44, -16], [50, -13], [49, -20], [45, -25], [43, -21], [44, -16]],
  // Arabian gulf island blocks are omitted; Sri Lanka
  [[80, 9], [82, 7], [81, 6], [80, 9]],
]

function inPoly(lon, lat, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function globe() {
  // Desk globe on a meridian ring and stand: reads as "globe" at card size,
  // where a bare sphere with an orbit ring read as a planet. Flat shading only
  // (no crescent-shaped night side), land as a dot matrix, routes from Tashkent.
  const S = new Scene(W, H, 1616)
  const cx = 600
  const cy = 368
  const R = 258
  const lon0 = 60
  const tilt = (14 * Math.PI) / 180
  const lean = 22 // axial lean of the globe in the frame, degrees clockwise
  const RING = R + 24
  const FLOOR = 728
  S.add(rect(0, 0, W, H, C.paper))
  S.add(rect(0, 0, W, FLOOR, gridPat(S, { color: C.shade, size: 50, sw: 1, x: 0, y: 0 })))
  S.add(rect(0, FLOOR, W, H - FLOOR, C.shade), line(0, FLOOR, W, FLOOR, C.shade2, 2))
  const proj = (lat, lon, rad = 1) => {
    const p = (lat * Math.PI) / 180
    const l = ((lon - lon0) * Math.PI) / 180
    const X = Math.cos(p) * Math.sin(l) * rad
    const Y = Math.sin(p) * rad
    const Z = Math.cos(p) * Math.cos(l) * rad
    const Y2 = Y * Math.cos(tilt) - Z * Math.sin(tilt)
    const Z2 = Y * Math.sin(tilt) + Z * Math.cos(tilt)
    return { x: cx + R * X, y: cy - R * Y2, z: Z2 }
  }
  // stand: base plate, stem, cradle
  S.add(
    poly([[cx - 150, FLOOR], [cx + 150, FLOOR], [cx + 118, FLOOR - 26], [cx - 118, FLOOR - 26]], C.ink),
    rect(cx - 124, FLOOR - 32, 248, 8, C.em, { rx: 3 }),
    poly([[cx - 12, FLOOR - 32], [cx + 12, FLOOR - 32], [cx + 7, cy + RING + 18], [cx - 7, cy + RING + 18]], C.ink),
    rect(cx - 26, cy + RING + 6, 52, 16, C.ink, { rx: 4 }),
  )
  const parts = []
  parts.push(circ(cx, cy, R, C.em4))
  // graticule (front hemisphere only)
  const curves = []
  const curve = (fn, from, to, step) => {
    let cur = []
    for (let t = from; t <= to + 1e-9; t += step) {
      const p = fn(t)
      if (p.z > 0) cur.push([p.x, p.y])
      else if (cur.length) {
        curves.push(cur)
        cur = []
      }
    }
    if (cur.length > 1) curves.push(cur)
  }
  for (let lon = -180; lon < 180; lon += 20) curve((t) => proj(t, lon), -90, 90, 3)
  for (let lat = -80; lat <= 80; lat += 20) curve((t) => proj(lat, t), -180, 180, 3)
  parts.push(path(curves.map((c) => 'M' + c.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join('L')).join(''), hair(C.em3, 1.2)))
  // equator a touch heavier
  const eq = []
  for (let t = -180; t <= 180; t += 3) {
    const p = proj(0, t)
    if (p.z > 0) eq.push([p.x, p.y])
  }
  eq.sort((a, b) => a[0] - b[0])
  parts.push(pline(eq, C.em2, 1.8))
  // dot-matrix land
  const land = []
  const step = 2.2
  for (let lat = -60; lat <= 80; lat += step) {
    const dl = step / Math.max(0.25, Math.cos((lat * Math.PI) / 180))
    for (let lon = -180; lon < 180; lon += dl) {
      if (!LAND.some((pl) => inPoly(lon, lat, pl))) continue
      const p = proj(lat, lon)
      if (p.z > 0.05) land.push([Math.round(p.x), Math.round(p.y)])
    }
  }
  parts.push(dotsPath(land, C.em, 5.6))
  parts.push(circ(cx, cy, R, 'none', { stroke: C.ink, 'stroke-width': 2 }))
  // great-circle routes from Tashkent, lifted off the surface
  const hub = [41.3, 69.2]
  const dest = [[25.2, 55.3], [3.1, 101.7], [51.5, -0.1], [41.0, 29.0], [24.7, 46.7], [1.3, 103.8], [39.9, 116.4], [55.8, 37.6]]
  const v3 = (lat, lon) => {
    const p = (lat * Math.PI) / 180
    const l = (lon * Math.PI) / 180
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)]
  }
  const toLL = ([x, y, z]) => {
    const r = Math.hypot(x, y, z)
    return [(Math.asin(y / r) * 180) / Math.PI, (Math.atan2(x, z) * 180) / Math.PI, r]
  }
  const arcs = []
  const nodes = []
  for (const [la, lo] of dest) {
    const A = v3(...hub)
    const B = v3(la, lo)
    const om = Math.acos(A[0] * B[0] + A[1] * B[1] + A[2] * B[2])
    const c = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const s1 = Math.sin((1 - t) * om) / Math.sin(om)
      const s2 = Math.sin(t * om) / Math.sin(om)
      const P = [A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2]
      const [lat, lon] = toLL(P)
      const q = proj(lat, lon, 1 + 0.16 * Math.sin(Math.PI * t) * Math.min(1, om * 1.4))
      c.push([q.x, q.y])
    }
    arcs.push(c)
    const pn = proj(la, lo)
    nodes.push([pn.x, pn.y])
  }
  parts.push(arcs.map((c) => pline(c, C.ink, 2)))
  parts.push(nodes.map(([x, y]) => [circ(x, y, 8, C.paper), circ(x, y, 5, C.ink)]))
  const hp = proj(...hub)
  parts.push(circ(hp.x, hp.y, 19, 'none', { stroke: C.brass, 'stroke-width': 2.5 }), circ(hp.x, hp.y, 11, C.brass))
  S.add(g(parts, { transform: `rotate(${lean} ${cx} ${cy})` }))
  // meridian ring with axis pins at the leaned poles
  const a = (lean * Math.PI) / 180
  const pin = (s) => [cx + s * Math.sin(a) * RING, cy - s * Math.cos(a) * RING]
  const [nx, ny] = pin(1)
  const [sx, sy] = pin(-1)
  S.add(
    circ(cx, cy, RING, 'none', { stroke: C.ink, 'stroke-width': 10 }),
    circ(cx, cy, RING, 'none', { stroke: C.em2, 'stroke-width': 2 }),
    line(cx + Math.sin(a) * (R - 2), cy - Math.cos(a) * (R - 2), nx, ny, C.ink, 5),
    line(cx - Math.sin(a) * (R - 2), cy + Math.cos(a) * (R - 2), sx, sy, C.ink, 5),
    circ(nx, ny, 9, C.ink), circ(nx, ny, 3.5, C.em4),
    circ(sx, sy, 9, C.ink), circ(sx, sy, 3.5, C.em4),
  )
  return S
}

/* ------------------------------------------------------------ gulf skyline */
function gulfSkyline() {
  const S = new Scene(W, H, 1717)
  const WL = 600
  S.add(rect(0, 0, W, H, C.paper))
  // Sun as a full disc well clear of the horizon: a half disc sitting on the
  // waterline next to towers can be misread as a gilded dome.
  S.add(circ(232, 300, 92, C.brass))
  // far band
  const far = []
  for (let x = 380; x < W; x += 0) {
    const w = S.r(30, 60)
    far.push([x, S.r(450, 520), w, 0])
    x += w + S.r(6, 20)
  }
  S.add(path(rectsD(far.map(([x, y, w]) => [x, y, w, WL - y])), { fill: C.em4 }))
  // supertall with setbacks and spire
  const st = (cx, base, tiers, col, side) => {
    const out = []
    for (const [w, y0, y1] of tiers) {
      out.push(rect(cx - w / 2, y0, w, y1 - y0, col))
      out.push(rect(cx + w / 2 - w * 0.28, y0, w * 0.28, y1 - y0, side))
    }
    return out
  }
  S.add(
    st(820, WL, [[110, 300, WL], [84, 190, 300], [60, 110, 190], [36, 60, 110]], C.em, C.ink),
    line(820, 10, 820, 60, C.ink, 3),
    winFill(S, 772, 312, 50, WL - 330, { kind: 'bands', color: C.em2, fh: 12, ratio: 0.4 }),
    winFill(S, 785, 200, 32, 90, { kind: 'bands', color: C.em2, fh: 12, ratio: 0.4 }),
  )
  // blade tower with slanted top
  S.add(poly([[560, 170], [650, 230], [650, WL], [560, WL]], C.em2), poly([[650, 230], [690, 256], [690, WL], [650, WL]], C.em))
  S.add(g(winFill(S, 560, 160, 90, WL - 160, { kind: 'mullion', color: C.em3, cw: 15, fh: 14 }), { 'clip-path': `url(#${(() => { const id = S.id('c'); S.def(`<clipPath id="${id}">${poly([[560, 172], [650, 232], [650, WL], [560, WL]], C.ink)}</clipPath>`); return id })()})` }))
  // twin towers with mono-pitch crowns forming a V between them (no
  // pyramidal tops or needle spires, which read as minarets at small sizes)
  for (const [x, top, up] of [[950, 260, 0], [1050, 300, 1]]) {
    const yl = up ? top + 44 : top
    const yr = up ? top : top + 44
    S.add(poly([[x, yl], [x + 80, yr], [x + 80, WL], [x, WL]], C.ink))
    S.add(winFill(S, x + 8, top + 60, 64, WL - top - 74, { kind: 'grid', color: C.em, cols: 4, gx: 4, gy: 5, fh: 14 }))
    S.add(line(x + 6, top + 52, x + 74, top + 52, C.em, 2))
  }
  // diagrid tower with a sloped crown
  const dg = [[440, 262], [516, 230], [516, WL], [440, WL]]
  const dgc = S.id('c')
  S.def(`<clipPath id="${dgc}">${poly(dg, C.ink)}</clipPath>`)
  S.add(poly(dg, C.em3))
  S.add(g([rect(440, 220, 76, WL - 220, hatch(S, { color: C.em4, gap: 26, angle: 32, sw: 1.5 })), rect(440, 220, 76, WL - 220, hatch(S, { color: C.em4, gap: 26, angle: -32, sw: 1.5 }))], { 'clip-path': `url(#${dgc})` }))
  S.add(rect(500, 230, 16, WL - 230, C.em2), pline([[440, 262], [516, 230]], C.ink, 1.5))
  // left low district
  S.add(tower(S, { x: 370, w: 60, top: 430, base: WL, fill: C.em, win: { kind: 'grid', color: C.em2, cols: 3, gx: 6, gy: 6, fh: 14, m: 8 } }))
  S.add(tower(S, { x: 1140, w: 70, top: 410, base: WL, fill: C.em2, win: { kind: 'bands', color: C.em, fh: 14, ratio: 0.4, m: 8 } }))
  S.add(tower(S, { x: 700, w: 70, top: 380, base: WL, fill: C.em3, win: { kind: 'grid', color: C.em4, cols: 3, gx: 6, gy: 6, fh: 14, m: 8 } }))
  // promenade and water
  S.add(rect(0, WL, W, 14, C.ink), rect(0, WL + 14, W, H - WL - 14, C.em4))
  const ripples = []
  for (let y = WL + 30; y < H; y += 14) {
    for (let x = S.r(-60, 0); x < W; x += S.r(80, 200)) ripples.push([x, y, x + S.r(30, 120), y])
  }
  S.add(path(segsD(ripples), hair(C.em3, 1.4)))
  // sun reflection
  const refl = []
  for (let i = 0; i < 9; i++) {
    const y = WL + 26 + i * 16
    const hw = 74 - i * 7
    refl.push([232 - hw, y, 232 + hw, y])
  }
  S.add(path(segsD(refl), hair(C.brass, 3)))
  // tower reflections
  const tr = []
  for (const [x, w, c] of [[820, 60, C.em], [605, 50, C.em2], [990, 40, C.ink], [1090, 40, C.ink]]) {
    for (let i = 0; i < 8; i++) tr.push([x - w / 2 + S.r(0, 10), WL + 34 + i * 18, x + w / 2 - S.r(0, 10), WL + 34 + i * 18, c])
  }
  for (const c of [C.em, C.em2, C.ink]) S.add(path(segsD(tr.filter((t) => t[4] === c)), hair(c, 3)))
  return S
}

/* --------------------------------------------------------- financial district */
function financialDistrict() {
  const S = new Scene(W, H, 1818)
  const cx = 600
  const cy = 380
  const F = 200
  const EYE = 1.6
  const pr = (X, Y, Z) => [cx + (F * X) / Z, cy - (F * (Y - EYE)) / Z]
  const quad = (list, fill, a) => poly(list.map((p) => pr(...p)), fill, a)
  S.add(rect(0, 0, W, H, C.paper))
  // sun in the gap at the end of the street
  S.add(circ(cx, 250, 46, C.brass))
  // far tower closing the vista
  const ZF = 22
  S.add(quad([[-2.2, 0, ZF], [2.2, 0, ZF], [2.2, 15, ZF], [-2.2, 15, ZF]], C.em3))
  const [fx0, fy0] = pr(-2.2, 15, ZF)
  const [fx1, fy1] = pr(2.2, 0, ZF)
  S.add(winFill(S, fx0 + 4, fy0 + 6, fx1 - fx0 - 8, fy1 - fy0 - 10, { kind: 'mullion', color: C.em4, cw: 7, fh: 7 }))
  const Z0 = 0.55
  const Z1 = 20
  // street, pavements
  S.add(quad([[-7, 0, Z0], [7, 0, Z0], [7, 0, Z1], [-7, 0, Z1]], C.shade))
  S.add(quad([[-3.2, 0, Z0], [3.2, 0, Z0], [3.2, 0, Z1], [-3.2, 0, Z1]], C.shade2))
  const lanes = []
  for (let z = 0.7; z < Z1; z *= 1.32) lanes.push([...pr(0, 0, z), ...pr(0, 0, z * 1.14)])
  S.add(path(segsD(lanes), hair(C.paper, 3)))
  S.add(path(segsD([[...pr(-3.2, 0, Z0), ...pr(-3.2, 0, Z1)], [...pr(3.2, 0, Z0), ...pr(3.2, 0, Z1)]]), hair(C.ink, 1.2)))
  for (let i = 0; i < 8; i++) {
    const x0 = -3.0 + i * 0.78
    S.add(quad([[x0, 0, 1.25], [x0 + 0.42, 0, 1.25], [x0 + 0.42, 0, 1.6], [x0, 0, 1.6]], C.paper))
  }
  // cross street paving
  S.add(quad([[-12, 0, 6.2], [-4.6, 0, 6.2], [-4.6, 0, 7.0], [-12, 0, 7.0]], C.shade2), quad([[4.6, 0, 7.4], [12, 0, 7.4], [12, 0, 8.2], [4.6, 0, 8.2]], C.shade2))
  // building blocks on both sides: [z0, z1, height, fill, kind]
  const blocks = [
    [0.8, 3.4, 12, C.em, 'curtain'], [3.4, 6.2, 6, C.shade2, 'classic'], [7.0, 10.5, 16, C.em2, 'grid'], [10.5, 14.5, 11, C.em3, 'curtain'], [14.5, 20, 13, C.em4, 'grid'],
  ]
  const blocksR = [
    [0.8, 3.0, 5.2, C.shade2, 'classic'], [3.0, 7.4, 17, C.em2, 'curtain'], [8.2, 11.6, 12, C.em, 'grid'], [11.6, 16, 15, C.em4, 'curtain'], [16, 20, 10, C.em3, 'grid'],
  ]
  const XW = 4.6
  const side = (sgn, list) => {
    const dark = { [C.em]: C.ink, [C.em2]: C.em, [C.em3]: C.em2, [C.em4]: C.em3, [C.shade2]: C.em3 }
    for (const [idx, [z0, z1, h, fill, kind]] of [...list.entries()].reverse()) {
      const X = sgn * XW
      // a cross street before this block exposes its near end face
      if (idx > 0 && list[idx - 1][1] < z0) {
        S.add(quad([[X, 0, z0], [X, h, z0], [sgn * 12, h, z0], [sgn * 12, 0, z0]], dark[fill]))
        const fl = []
        for (let y = 1.2; y < h - 0.4; y += 0.8) fl.push([...pr(X, y, z0), ...pr(sgn * 12, y, z0)])
        S.add(path(segsD(fl), hair(fill, 1)))
      }
      // front (street-facing) end cap of the block, visible from the street
      S.add(quad([[X, 0, z0], [X, h, z0], [X, h, z1], [X, 0, z1]], fill))
      // cornice
      S.add(quad([[X, h - 0.25, z0], [X, h, z0], [X, h, z1], [X, h - 0.25, z1]], C.ink))
      const segs = []
      if (kind === 'grid' || kind === 'curtain') {
        for (let y = 1.2; y < h - 0.4; y += kind === 'curtain' ? 0.5 : 0.8) segs.push([...pr(X, y, z0), ...pr(X, y, z1)])
        const n = kind === 'curtain' ? 8 : 5
        for (let i = 1; i < n; i++) {
          const z = z0 + ((z1 - z0) * i) / n
          segs.push([...pr(X, 1, z), ...pr(X, h - 0.3, z)])
        }
        S.add(path(segsD(segs), hair(fill === C.em || fill === C.em2 ? C.em4 : C.em2, kind === 'curtain' ? 0.9 : 1.6)))
      } else {
        // classical bank: square pilasters, entablature, plinth
        for (let i = 0; i < 6; i++) {
          const za = z0 + ((z1 - z0) * (i + 0.15)) / 6
          const zb = z0 + ((z1 - z0) * (i + 0.45)) / 6
          S.add(quad([[X, 1.1, za], [X, h - 1.6, za], [X, h - 1.6, zb], [X, 1.1, zb]], C.paper))
        }
        S.add(quad([[X, h - 1.6, z0], [X, h - 1.0, z0], [X, h - 1.0, z1], [X, h - 1.6, z1]], C.ink))
        S.add(quad([[X, 0, z0], [X, 1.1, z0], [X, 1.1, z1], [X, 0, z1]], C.em3))
      }
      // ground-floor shop band
      S.add(quad([[X, 0, z0], [X, 0.9, z0], [X, 0.9, z1], [X, 0, z1]], kind === 'classic' ? C.em3 : C.em))
      S.add(quad([[X, 0.9, z0], [X, 1.0, z0], [X, 1.0, z1], [X, 0.9, z1]], C.ink))
      S.add(path(segsD([[...pr(X, 0, z0), ...pr(X, h, z0)]]), hair(C.ink, 1.5)))
    }
  }
  side(-1, blocks)
  side(1, blocksR)
  // street lamps
  for (const z of [1.5, 2.6, 4.5, 8, 14]) {
    for (const sgn of [-1, 1]) {
      const [x0, y0] = pr(sgn * 3.6, 0, z)
      const [, y1] = pr(sgn * 3.6, 2.9, z)
      const [x2] = pr(sgn * 3.0, 2.9, z)
      S.add(line(x0, y0, x0, y1, C.ink, Math.max(1, 5 / z)), line(x0, y1, x2, y1, C.ink, Math.max(1, 4 / z)), rect(Math.min(x0, x2) + (sgn < 0 ? (x2 - x0) * 0.6 : 0), y1, Math.abs(x2 - x0) * 0.4, Math.max(2, 10 / z), C.em))
    }
  }
  // street trees in planters (left pavement)
  for (const z of [2.0, 3.4, 6]) {
    const [x, y] = pr(-3.9, 0, z)
    const r = 150 / z
    S.add(line(x, y, x, y - r * 1.4, C.ink, Math.max(1, 6 / z)), circ(x, y - r * 1.9, r * 0.7, C.em2))
  }
  // a car seen from behind in the near lane
  const car = (X, Z, col) => {
    const [x0, y0] = pr(X - 0.9, 0.25, Z)
    const [x1, y1] = pr(X + 0.9, 1.45, Z)
    const w = x1 - x0
    const h = y0 - y1
    return [
      rect(x0 + w * 0.12, y1, w * 0.76, h * 0.42, col, { rx: w * 0.08 }),
      rect(x0 + w * 0.18, y1 + h * 0.08, w * 0.64, h * 0.26, C.em4),
      rect(x0, y1 + h * 0.4, w, h * 0.46, col, { rx: w * 0.05 }),
      rect(x0 + w * 0.06, y1 + h * 0.52, w * 0.16, h * 0.1, C.paper),
      rect(x0 + w * 0.78, y1 + h * 0.52, w * 0.16, h * 0.1, C.paper),
      rect(x0 + w * 0.06, y0 - h * 0.1, w * 0.14, h * 0.26, C.ink),
      rect(x0 + w * 0.8, y0 - h * 0.1, w * 0.14, h * 0.26, C.ink),
    ]
  }
  S.add(car(1.4, 7, C.em), car(-1.5, 4.2, C.ink))
  return S
}

/* --------------------------------------------------------------- club hall */
function clubHall() {
  const S = new Scene(W, H, 1919)
  const FY = 500
  S.add(rect(0, 0, W, H, C.shade))
  // ceiling band with track lights
  S.add(rect(0, 0, W, 70, C.em4), line(0, 70, W, 70, C.ink, 1.5), line(80, 40, 1120, 40, C.ink, 2))
  for (let x = 140; x < 1100; x += 120) S.add(rect(x - 8, 40, 16, 22, C.ink), rect(x - 5, 62, 10, 4, C.em3))
  // wall timber slats
  S.add(rect(0, 70, W, FY - 70, hatch(S, { color: C.shade2, gap: 16, angle: 0, sw: 3 })))
  // screen
  const SX = 330
  const SY = 110
  const SW = 540
  const SH = 300
  S.add(rect(SX - 10, SY - 10, SW + 20, SH + 20, C.ink), rect(SX, SY, SW, SH, C.em))
  const gr = []
  for (let i = 1; i < 4; i++) gr.push([SX + 50, SY + 50 + i * 55, SX + SW - 50, SY + 50 + i * 55])
  S.add(path(segsD(gr), hair(C.em2, 1)))
  S.add(pline([[SX + 50, SY + 230], [SX + 140, SY + 200], [SX + 220, SY + 214], [SX + 300, SY + 150], [SX + 380, SY + 128], [SX + 470, SY + 82]], C.em4, 4))
  S.add(circ(SX + 470, SY + 82, 9, C.brass))
  S.add(path(rectsD([[SX + 60, SY + 245, 40, 20], [SX + 150, SY + 230, 40, 35], [SX + 240, SY + 220, 40, 45], [SX + 330, SY + 200, 40, 65], [SX + 420, SY + 185, 40, 80]].map(([x, y, w, h]) => [x, y + 0, w, h - 0])), { fill: C.em2 }))
  // lectern and plants
  S.add(poly([[150, FY], [166, 400], [254, 400], [270, FY]], C.ink), rect(156, 388, 108, 14, C.em), path('M236 388Q240 350 220 340', hair(C.ink, 2.5)))
  for (const x of [1010, 1100]) S.add(rect(x - 26, FY - 50, 52, 50, C.em), circ(x, FY - 86, 40, C.em2), circ(x - 24, FY - 66, 26, C.em2))
  // floor
  S.add(rect(0, FY, W, H - FY, C.em4), line(0, FY, W, FY, C.ink, 1.5))
  const fl = []
  for (let i = -12; i <= 12; i++) fl.push([600 + i * 40, FY, 600 + i * 260, H])
  S.add(path(segsD(fl), hair(C.em3, 1)))
  // rows of chairs from behind
  const chairPath = (x, y, s) => d`M${x - 22 * s} ${y}V${y - 40 * s}Q${x - 22 * s} ${y - 50 * s} ${x - 12 * s} ${y - 50 * s}H${x + 12 * s}Q${x + 22 * s} ${y - 50 * s} ${x + 22 * s} ${y - 40 * s}V${y}Z`
  const rows = [
    [540, 0.62], [575, 0.74], [620, 0.9], [676, 1.1], [746, 1.36], [832, 1.68],
  ]
  for (const [ri, [y, s]] of rows.entries()) {
    const backs = []
    const legs = []
    const seats = []
    const step = 62 * s
    const aisle = 46 * s
    for (const sgn of [-1, 1]) {
      for (let k = 0; k < 14; k++) {
        const x = 600 + sgn * (aisle + step * (k + 0.5))
        if (x < -60 || x > W + 60) continue
        backs.push(chairPath(x, y - 22 * s, s))
        seats.push([x - 24 * s, y - 22 * s, 48 * s, 8 * s])
        legs.push([x - 18 * s, y - 14 * s, x - 20 * s, y + 8 * s], [x + 18 * s, y - 14 * s, x + 20 * s, y + 8 * s])
      }
    }
    S.add(path(segsD(legs), hair(C.ink, Math.max(1, 2.2 * s))))
    S.add(path(rectsD(seats), { fill: C.ink }))
    S.add(path(backs.join(''), { fill: ri % 2 ? C.em : C.em2 }))
  }
  return S
}

/* -------------------------------------------------------------------- panel */
function panel() {
  const S = new Scene(W, H, 2020)
  const ST = 560
  S.add(rect(0, 0, W, H, C.shade))
  // lighting truss
  S.add(rect(0, 60, W, 16, 'none', { stroke: C.ink, 'stroke-width': 2 }))
  S.add(path(segsD(Array.from({ length: 40 }, (_, i) => [i * 30, 76, i * 30 + 15, 60])), hair(C.ink, 1.2)))
  for (const x of [200, 380, 820, 1000]) S.add(rect(x - 14, 76, 28, 34, C.ink, { rx: 4 }), rect(x - 10, 110, 20, 6, C.em3))
  // backdrop: slatted wall with a blank screen and brass rule
  S.add(rect(60, 140, W - 120, ST - 140, C.em4), rect(60, 140, W - 120, ST - 140, hatch(S, { color: C.em3, gap: 22, angle: 0, sw: 2 })))
  S.add(rect(320, 172, 560, 246, C.ink), rect(330, 180, 540, 230, C.em))
  S.add(path(rectsD([[370, 330, 40, 80], [416, 290, 52, 120], [474, 350, 30, 60], [510, 250, 44, 160], [560, 310, 36, 100], [602, 270, 58, 140], [666, 340, 34, 70], [706, 300, 46, 110], [758, 356, 30, 54], [794, 320, 40, 90]]), { fill: C.em2 }))
  S.add(line(350, 410, 850, 410, C.em3, 1.5))
  S.add(rect(320, 430, 560, 4, C.brass))
  // stage
  S.add(rect(0, ST, W, 24, C.shade2), rect(0, ST + 24, W, 86, C.em), line(0, ST, W, ST, C.ink, 1.5), line(0, ST + 24, W, ST + 24, C.ink, 1.5))
  S.add(winFill(S, 0, ST + 24, W, 86, { kind: 'fins', color: C.em2, cw: 120, fh: 86, ratio: 0.02 }))
  // armchairs (frontal), slightly varied
  const chair = (x, s = 1) => [
    rect(x - 62 * s, ST - 170 * s, 124 * s, 120 * s, C.ink, { rx: 18 * s }),
    rect(x - 54 * s, ST - 162 * s, 108 * s, 100 * s, C.em2, { rx: 14 * s }),
    rect(x - 78 * s, ST - 96 * s, 30 * s, 70 * s, C.ink, { rx: 10 * s }),
    rect(x + 48 * s, ST - 96 * s, 30 * s, 70 * s, C.ink, { rx: 10 * s }),
    rect(x - 52 * s, ST - 68 * s, 104 * s, 30 * s, C.em, { rx: 8 * s }),
    rect(x - 60 * s, ST - 40 * s, 120 * s, 14 * s, C.ink, { rx: 4 }),
    line(x - 50 * s, ST - 26 * s, x - 56 * s, ST, C.ink, 4),
    line(x + 50 * s, ST - 26 * s, x + 56 * s, ST, C.ink, 4),
  ]
  S.add(chair(200), chair(400), chair(800), chair(1000))
  // low round table with carafe and glasses
  S.add(rect(520, ST - 52, 160, 12, C.ink, { rx: 4 }), rect(530, ST - 40, 8, 40, C.ink), rect(662, ST - 40, 8, 40, C.ink), rect(538, ST - 14, 124, 4, C.ink))
  S.add(rect(560, ST - 112, 30, 60, C.paper, { rx: 8, stroke: C.ink, 'stroke-width': 1.5 }), rect(568, ST - 124, 14, 14, C.paper, { stroke: C.ink, 'stroke-width': 1.5 }), rect(562, ST - 84, 26, 30, C.em3, { rx: 4 }), rect(606, ST - 84, 18, 32, C.paper), rect(632, ST - 84, 18, 32, C.paper), line(606, ST - 70, 624, ST - 70, C.em4, 1.5), line(632, ST - 70, 650, ST - 70, C.em4, 1.5))
  // floor microphone stands
  for (const x of [300, 900]) S.add(line(x, ST, x, ST - 140, C.ink, 2), line(x - 18, ST, x + 18, ST, C.ink, 3), rect(x - 4, ST - 154, 8, 16, C.ink, { rx: 4 }))
  // steps (right) and audience floor
  S.add(rect(1080, ST + 40, 120, 30, C.shade2), rect(1050, ST + 70, 150, 40, C.shade2), line(1080, ST + 40, 1200, ST + 40, C.ink, 1), line(1050, ST + 70, 1200, ST + 70, C.ink, 1))
  S.add(rect(0, ST + 110, W, H - ST - 110, C.shade2), line(0, ST + 110, W, ST + 110, C.ink, 1.5))
  S.add(rect(0, ST + 112, W, H - ST - 110, dots(S, { color: C.shade, gap: 12, r: 1.5 })))
  return S
}

/* ---------------------------------------------------------------- portraits */
const HEAD = 'M400 168C468 168 520 222 520 306C520 398 470 474 400 474C330 474 280 398 280 306C280 222 332 168 400 168Z'

function portrait(n, o) {
  const S = new Scene(800, 800, 3000 + n)
  const face = o.face ?? C.shade2
  const jacket = o.jacket ?? C.em
  const hairC = o.hair ?? C.ink
  S.add(rect(0, 0, 800, 800, o.bg))
  S.add(rect(0, 0, 800, 800, o.bgTex ? o.bgTex(S) : dots(S, { color: o.bgDot ?? C.paper, gap: 18, r: 1.3 })))
  if (o.bgShape) S.add(o.bgShape)
  // hair behind the head (long hair / bob volume)
  if (o.hairBack) {
    const [bx, by] = o.scale ?? [1, 1]
    S.add(path(o.hairBack, { fill: hairC, transform: bx === 1 && by === 1 ? undefined : `translate(400 474) scale(${bx} ${by}) translate(-400 -474)` }))
  }
  // neck
  S.add(path('M352 420V548H448V420Z', { fill: face }))
  S.add(path('M352 470Q400 500 448 470', hair(C.ink, 1)))
  // torso
  const shoulders = 'M70 800L92 660C104 596 160 566 246 548L352 524H448L554 548C640 566 696 596 708 660L730 800Z'
  S.add(path(shoulders, { fill: jacket }))
  const shade = { [C.em]: C.em2, [C.em2]: C.em, [C.ink]: C.em, [C.shade2]: C.shade, [C.shade]: C.shade2 }
  const jc = S.id('c')
  S.def(`<clipPath id="${jc}">${path(shoulders)}</clipPath>`)
  S.add(
    g(
      [
        rect(430, 500, 400, 300, hatch(S, { color: shade[jacket], gap: 8, angle: 50, sw: 1.2 })),
        path('M246 548C200 562 166 590 150 640M554 548C600 562 634 590 650 640', hair(shade[jacket], 1.5)),
        path('M168 800C172 740 182 700 204 668M632 800C628 740 618 700 596 668', hair(shade[jacket], 1.5)),
        path('M120 700C136 690 160 684 190 684M680 700C664 690 640 684 610 684', hair(shade[jacket], 1)),
      ],
      { 'clip-path': `url(#${jc})` },
    ),
  )
  S.add(path('M92 660C104 596 160 566 246 548L352 524M448 524L554 548C640 566 696 596 708 660', hair(shade[jacket], 1.2)))
  if (o.torso) S.add(o.torso)
  // head: ears, face, hair, glasses — grouped so proportions can vary
  const hp = []
  if (!o.noEars) hp.push(ell(282, 320, 18, 32, face), ell(518, 320, 18, 32, face), path('M276 304Q286 320 278 338', hair(C.ink, 1)), path('M524 304Q514 320 522 338', hair(C.ink, 1)))
  hp.push(path(HEAD, { fill: face }))
  if (o.hairFront) {
    hp.push(path(o.hairFront, { fill: hairC, stroke: { [C.ink]: C.ink, [C.em]: C.ink, [C.em4]: C.em3 }[hairC] ?? C.ink, 'stroke-width': 1, 'stroke-linejoin': 'round' }))
    const hc = S.id('c')
    S.def(`<clipPath id="${hc}">${path(o.hairFront)}</clipPath>`)
    const tone = { [C.ink]: C.em, [C.em]: C.em2, [C.em4]: C.paper }[hairC] ?? C.em2
    hp.push(g(rect(200, 100, 400, 300, hatch(S, { color: tone, gap: 11, angle: o.hairAngle ?? 65, sw: 1 })), { 'clip-path': `url(#${hc})` }))
  }
  if (o.glasses) {
    const gc = o.glassesColor ?? C.ink
    hp.push(
      rect(318, 304, 70, 46, 'none', { rx: 14, stroke: gc, 'stroke-width': 5 }),
      rect(412, 304, 70, 46, 'none', { rx: 14, stroke: gc, 'stroke-width': 5 }),
      path('M388 318Q400 310 412 318', hair(gc, 4)),
      line(318, 316, 286, 310, gc, 4),
      line(482, 316, 514, 310, gc, 4),
    )
  }
  if (o.extra) hp.push(o.extra)
  const [sx, sy] = o.scale ?? [1, 1]
  S.add(g(hp, sx === 1 && sy === 1 ? {} : { transform: `translate(400 474) scale(${sx} ${sy}) translate(-400 -474)` }))
  return S
}

const suitTorso = (jacketDark, shirt = C.paper, tie = C.ink) => [
  poly([[352, 524], [400, 640], [448, 524]], shirt),
  poly([[352, 524], [372, 512], [400, 572], [380, 590]], shirt, { stroke: C.ink, 'stroke-width': 1 }),
  poly([[448, 524], [428, 512], [400, 572], [420, 590]], shirt, { stroke: C.ink, 'stroke-width': 1 }),
  tie ? poly([[388, 578], [412, 578], [420, 700], [400, 728], [380, 700]], tie) : null,
  tie ? poly([[386, 566], [414, 566], [410, 588], [390, 588]], tie) : null,
  poly([[340, 528], [400, 740], [372, 800], [300, 800], [318, 640], [286, 600]], jacketDark),
  poly([[460, 528], [400, 740], [428, 800], [500, 800], [482, 640], [514, 600]], jacketDark),
  path('M340 528L286 600L318 640M460 528L514 600L482 640', hair(C.ink, 1.2)),
  path('M400 740V800', hair(C.ink, 1.2)),
  circ(400, 776, 6, C.ink),
  line(296, 650, 318, 646, C.ink, 1.2),
  rect(530, 640, 50, 8, C.paper),
  path('M530 648H580', hair(C.ink, 1)),
]

const PORTRAITS = [
  {
    // man, side-parted short hair, suit and tie
    bg: C.em4,
    bgShape: [path(segsD([[0, 40, 800, 40], [0, 80, 800, 80], [0, 120, 800, 120], [0, 160, 800, 160], [0, 200, 800, 200], [0, 240, 800, 240], [0, 280, 800, 280], [0, 320, 800, 320], [0, 360, 800, 360], [0, 400, 800, 400], [0, 440, 800, 440], [0, 480, 800, 480], [0, 520, 800, 520], [0, 560, 800, 560], [0, 600, 800, 600], [0, 640, 800, 640], [0, 680, 800, 680], [0, 720, 800, 720], [0, 760, 800, 760]]), hair(C.em3, 0.8)), circ(400, 330, 300, C.shade), circ(400, 330, 340, 'none', { stroke: C.em3, 'stroke-width': 1.2 }), circ(400, 330, 356, 'none', { stroke: C.em3, 'stroke-width': 1 })],
    jacket: C.em,
    hairFront: 'M282 300C276 214 330 156 404 156C478 156 528 210 520 300C512 262 498 236 466 222C430 236 360 232 330 214C304 236 290 262 282 300Z',
    torso: suitTorso(C.em2, C.paper, C.ink),
    extra: path('M330 214C360 232 430 236 466 222', hair(C.em2, 1.2)),
  },
  {
    // woman, bob with fringe, glasses, round-neck blouse under jacket
    bg: C.shade,
    bgShape: [rect(400, 0, 400, 800, C.em4), path(segsD([[450, 0, 450, 800], [500, 0, 500, 800], [550, 0, 550, 800], [600, 0, 600, 800], [650, 0, 650, 800], [700, 0, 700, 800], [750, 0, 750, 800], [400, 250, 800, 250]]), hair(C.em3, 1.2)), rect(400, 0, 8, 800, C.em3)],
    scale: [0.96, 1.0],
    jacket: C.ink,
    hair: C.ink,
    hairBack: 'M400 140C516 140 566 226 562 330L568 470Q570 498 540 500H260Q230 498 232 470L238 330C234 226 284 140 400 140Z',
    hairFront: 'M400 150C490 150 540 210 534 300C520 260 504 240 470 236C420 250 340 252 290 236C300 186 340 150 400 150Z',
    glasses: true,
    torso: [
      path('M330 528Q400 600 470 528Z', { fill: C.em3 }),
      path('M352 532Q400 586 448 532', hair(C.ink, 1.2)),
      circ(400, 559, 5, C.paper),
      poly([[330, 528], [400, 760], [360, 800], [290, 800], [300, 640], [270, 600]], C.em),
      poly([[470, 528], [400, 760], [440, 800], [510, 800], [500, 640], [530, 600]], C.em),
      path('M330 528L270 600L300 640L290 800M470 528L530 600L500 640L510 800', hair(C.ink, 1.2)),
      path('M310 700L330 694M490 700L470 694', hair(C.em3, 1.5)),
      circ(400, 780, 6, C.em),
    ],
  },
  {
    // older man, cropped grey hair, glasses, open collar
    bg: C.em3,
    bgTex: (S) => dots(S, { color: C.em2, gap: 14, r: 1.4 }),
    bgShape: [rect(110, 90, 580, 580, 'none', { stroke: C.em4, 'stroke-width': 1.5 }), rect(130, 110, 540, 540, 'none', { stroke: C.em4, 'stroke-width': 1 })],
    scale: [1.05, 0.98],
    face: C.shade,
    jacket: C.ink,
    hair: C.em4,
    hairFront: 'M284 290C282 210 336 170 400 170C468 170 520 212 516 290C506 246 480 222 446 214C410 222 380 222 350 214C316 222 292 248 284 290Z',
    glasses: true,
    torso: [
      poly([[352, 524], [400, 600], [448, 524]], C.paper),
      poly([[352, 524], [376, 508], [400, 560], [372, 586]], C.paper, { stroke: C.ink, 'stroke-width': 1 }),
      poly([[448, 524], [424, 508], [400, 560], [428, 586]], C.paper, { stroke: C.ink, 'stroke-width': 1 }),
      path('M400 560V720', hair(C.ink, 1)),
      circ(406, 600, 3.5, C.shade2), circ(406, 650, 3.5, C.shade2), circ(406, 700, 3.5, C.shade2),
      poly([[338, 528], [400, 720], [372, 800], [300, 800], [318, 640], [284, 600]], C.em),
      poly([[462, 528], [400, 720], [428, 800], [500, 800], [482, 640], [516, 600]], C.em),
      path('M338 528L284 600L318 640M462 528L516 600L482 640', hair(C.ink, 1.2)),
      path('M400 720V800', hair(C.em, 1.2)),
      circ(400, 760, 6, C.em),
      rect(526, 640, 54, 6, C.em),
    ],
  },
  {
    // woman, long dark hair worn loose over the shoulders, brass blouse.
    // Hair is ink (never emerald) and visibly falls in locks in front of the
    // shoulders with the neck exposed, so it cannot read as a head covering.
    bg: C.shade2,
    bgShape: [path(segsD([[50, 0, 50, 800], [100, 0, 100, 800], [150, 0, 150, 800], [200, 0, 200, 800], [250, 0, 250, 800], [300, 0, 300, 800], [350, 0, 350, 800], [400, 0, 400, 800], [450, 0, 450, 800], [500, 0, 500, 800], [550, 0, 550, 800], [600, 0, 600, 800], [650, 0, 650, 800], [700, 0, 700, 800], [750, 0, 750, 800]]), hair(C.shade, 1.5)), circ(400, 400, 330, C.em4), path(segsD([[0, 120, 800, 120], [0, 680, 800, 680]]), hair(C.em3, 1.2))],
    scale: [0.94, 1.02],
    jacket: C.em,
    hair: C.ink,
    noEars: true,
    hairBack: 'M400 140C516 140 566 228 560 336C556 420 562 480 574 600L226 600C238 480 244 420 240 336C234 228 284 140 400 140Z',
    hairFront: 'M400 148C494 148 542 214 532 318C524 272 504 240 452 226C420 252 350 264 284 270C292 198 338 148 400 148Z',
    torso: [
      poly([[340, 532], [400, 720], [460, 532]], C.brass),
      path('M352 532Q400 566 448 532', hair(C.ink, 1.2)),
      poly([[318, 540], [400, 760], [372, 800], [296, 800], [312, 650], [280, 610]], C.em2),
      poly([[482, 540], [400, 760], [428, 800], [504, 800], [488, 650], [520, 610]], C.em2),
      path('M318 540L280 610L312 650L296 800M482 540L520 610L488 650L504 800', hair(C.ink, 1.2)),
      circ(400, 782, 6, C.ink),
    ],
    extra: [
      // locks resting on the shoulders, in front of the jacket
      path('M286 300C272 380 262 450 268 510C274 560 262 604 236 640C284 634 318 604 330 556C340 512 326 470 312 428C300 390 292 344 286 300Z', { fill: C.ink }),
      path('M514 300C528 380 538 450 532 510C526 560 538 604 564 640C516 634 482 604 470 556C460 512 474 470 488 428C500 390 508 344 514 300Z', { fill: C.ink }),
      path('M290 380C282 450 290 520 270 600M510 380C518 450 510 520 530 600', hair(C.em, 1.2)),
      path('M258 300C252 380 254 450 262 520M542 300C548 380 546 450 538 520M272 250C262 290 262 330 266 370M528 250C538 290 538 330 534 370', hair(C.em, 1)),
    ],
  },
  {
    // man, tall textured hair, turtleneck
    bg: C.em4,
    bgTex: (S) => hatch(S, { color: C.em3, gap: 12, angle: 45, sw: 1 }),
    bgShape: [rect(0, 600, 800, 200, C.shade2), path(segsD([[40, 600, 40, 800], [120, 600, 120, 800], [200, 600, 200, 800], [280, 600, 280, 800], [360, 600, 360, 800], [440, 600, 440, 800], [520, 600, 520, 800], [600, 600, 600, 800], [680, 600, 680, 800], [760, 600, 760, 800]]), hair(C.shade, 2)), line(0, 600, 800, 600, C.em3, 1.5), line(0, 612, 800, 612, C.em3, 0.8)],
    scale: [1.03, 1.03],
    face: C.shade,
    jacket: C.em2,
    hair: C.ink,
    hairFront: 'M282 288C270 170 330 120 404 120C478 120 532 170 518 288C508 250 498 234 474 226C440 236 366 236 326 226C302 234 290 252 282 288Z',
    torso: [
      path('M346 420V540Q400 562 454 540V420Z', { fill: C.ink }),
      path('M346 470H454M346 500H454', hair(C.em, 1.5)),
      path(segsD([[358, 430, 358, 540], [370, 430, 370, 545], [382, 430, 382, 548], [394, 430, 394, 550], [406, 430, 406, 550], [418, 430, 418, 548], [430, 430, 430, 545], [442, 430, 442, 540]]), hair(C.em, 1)),
      path('M246 548L352 524V560Q400 580 448 560V524L554 548C600 560 640 576 660 600L560 800H240L140 600C160 576 200 560 246 548Z', { fill: C.ink }),
      path('M400 580V800', hair(C.em, 1.2)),
      path('M246 548L140 600L240 800M554 548L660 600L560 800', hair(C.em, 1.5)),
      path('M210 690L236 684M590 690L564 684', hair(C.em, 1.5)),
      path('M520 706H572M228 706H280', hair(C.em, 2)),
      path('M352 524Q400 540 448 524', hair(C.em, 1.2)),
    ],
  },
  {
    // woman, hair in a bun, glasses, collared shirt and jacket
    bg: C.em3,
    bgShape: [rect(0, 560, 800, 240, C.em2), path(segsD([[80, 0, 80, 560], [160, 0, 160, 560], [640, 0, 640, 560], [720, 0, 720, 560]]), hair(C.em2, 1.5))],
    scale: [0.95, 0.98],
    jacket: C.shade2,
    hair: C.ink,
    hairFront: 'M282 300C278 214 332 160 400 160C468 160 522 214 518 300C510 254 490 228 452 216C420 230 380 230 348 216C310 228 290 254 282 300Z',
    extra: [circ(400, 150, 52, C.ink), path('M360 170Q400 190 440 170', hair(C.em2, 1.5))],
    glasses: true,
    glassesColor: C.em,
    torso: [
      poly([[352, 524], [400, 620], [448, 524]], C.em),
      poly([[352, 524], [372, 510], [400, 570], [378, 590]], C.paper, { stroke: C.ink, 'stroke-width': 1 }),
      poly([[448, 524], [428, 510], [400, 570], [422, 590]], C.paper, { stroke: C.ink, 'stroke-width': 1 }),
      poly([[338, 528], [400, 760], [372, 800], [300, 800], [318, 640], [284, 600]], C.shade),
      poly([[462, 528], [400, 760], [428, 800], [500, 800], [482, 640], [516, 600]], C.shade),
      path('M338 528L284 600L318 640M462 528L516 600L482 640', hair(C.ink, 1.2)),
    ],
  },
  {
    // man, bald with side hair, glasses, suit with brass tie
    bg: C.shade,
    bgShape: [rect(120, 120, 560, 560, C.em4), rect(144, 144, 512, 512, 'none', { stroke: C.em3, 'stroke-width': 1.2 })],
    scale: [1.06, 0.97],
    face: C.shade2,
    jacket: C.ink,
    hair: C.em,
    hairFront: 'M282 340C276 286 284 248 304 224L326 230C310 260 304 300 308 350ZM518 340C524 286 516 248 496 224L474 230C490 260 496 300 492 350Z',
    glasses: true,
    torso: suitTorso(C.em, C.paper, C.brass),
  },
  {
    // woman, short pixie cut, mandarin-collar blouse, dark background
    bg: C.em,
    bgShape: [circ(400, 360, 280, C.em2), circ(400, 360, 310, 'none', { stroke: C.em2, 'stroke-width': 1.5 }), circ(400, 360, 330, 'none', { stroke: C.em2, 'stroke-width': 1 }), path(segsD([[0, 700, 800, 700], [0, 720, 800, 720], [0, 740, 800, 740], [0, 760, 800, 760], [0, 780, 800, 780]]), hair(C.em2, 1))],
    scale: [0.97, 1.0],
    face: C.shade,
    jacket: C.shade2,
    hair: C.ink,
    hairFront: 'M284 300C276 210 330 158 404 158C476 158 528 208 520 292C506 252 486 234 448 226C420 246 360 270 300 272C292 280 288 290 284 300Z',
    torso: [
      path('M346 516H454V546Q400 560 346 546Z', { fill: C.paper }),
      path('M400 546V800', hair(C.em3, 1.5)),
      circ(400, 600, 5, C.em3), circ(400, 660, 5, C.em3), circ(400, 720, 5, C.em3),
      path('M246 548C200 562 160 580 130 610M554 548C600 562 640 580 670 610', hair(C.em3, 1.2)),
      path('M352 524H448', hair(C.em3, 1)),
      path('M350 538Q400 552 450 538', { ...hair(C.em3, 1), 'stroke-dasharray': '3 4' }),
      path('M160 620Q400 660 640 620', hair(C.em3, 1.2)),
      path('M150 800C156 740 166 700 186 664M650 800C644 740 634 700 614 664', hair(C.em3, 1.2)),
      rect(436, 640, 46, 56, 'none', { stroke: C.em3, 'stroke-width': 1.2 }),
      path('M436 652H482', hair(C.em3, 1)),
    ],
    extra: [circ(282, 352, 5, C.brass), circ(518, 352, 5, C.brass), path('M300 272C360 270 420 246 448 226', hair(C.em, 1.2))],
  },
]

/* ===================================================================== run */

const SCENES = {
  'city-skyline': citySkyline,
  'city-street': cityStreet,
  'facade-lattice': facadeLattice,
  'bank-hall': bankHall,
  'glass-tower': glassTower,
  'chart-line': chartLine,
  'chart-bars': chartBars,
  'chart-candles': chartCandles,
  'meeting-table': meetingTable,
  signing,
  workshop,
  'agri-field': agriField,
  containers,
  construction,
  vehicles,
  globe,
  'gulf-skyline': gulfSkyline,
  'financial-district': financialDistrict,
  'club-hall': clubHall,
  panel,
}
PORTRAITS.forEach((o, i) => {
  SCENES[`portrait-${String(i + 1).padStart(2, '0')}`] = () => portrait(i + 1, o)
})

mkdirSync(OUT, { recursive: true })
const only = process.argv.slice(2)
let total = 0
for (const [name, fn] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue
  const file = join(OUT, `${name}.svg`)
  writeFileSync(file, fn().svg())
  const kb = statSync(file).size / 1024
  total += kb
  const flag = kb < 4 || kb > 40 ? '  <-- outside 4–40 KB' : ''
  console.log(`${name.padEnd(20)} ${kb.toFixed(1).padStart(6)} KB${flag}`)
}
console.log(`total ${total.toFixed(1)} KB`)
