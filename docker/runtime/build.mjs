/**
 * Second half of the image build (docker/Dockerfile), run after `next build`
 * in the repository root. It turns .next/standalone (Next's server.js and the
 * files it needs) into the one runtime tree that the app, the worker and the
 * one-shot jobs share (CMS-SPEC §15):
 *
 * 1. Bundles the processes Next does not build: the worker and its jobs, the
 *    migrate job, the account and import scripts and the backup audit
 *    recorder. Project code is bundled (TypeScript, the @/ paths); packages
 *    stay external and load from node_modules, as under tsx in development.
 *    The output mirrors the source tree under /app (src/worker/index.js,
 *    src/worker/jobs/*.js, scripts/*.js, docker/runtime/*.js), so the worker
 *    still finds its jobs by listing the folder next to it.
 * 2. Traces those bundles with Next's own file tracer and copies every package
 *    file they load that the standalone trace left out (the Payload CLI side
 *    of drizzle, for example).
 * 3. Removes the pages prerendered at build time. The image is built without a
 *    database (CONTENT_SOURCE=mock), so those pages hold the mock content;
 *    without them every page renders from the CMS on its first request and is
 *    cached from then on (in .next/server/route-cache, a volume in compose).
 *
 *   node docker/runtime/build.mjs
 */
import { build } from 'esbuild'
import { existsSync, readFileSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { nodeFileTrace } = require('next/dist/compiled/@vercel/nft')

const root = process.cwd()
const standalone = path.join(root, '.next/standalone')
const out = path.join(root, '.next/runtime')

if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('build: .next/standalone/server.js is missing; run `next build` with output: standalone first')
  process.exit(1)
}

// ── 1. Bundle ──────────────────────────────────────────────────────────────

const jobFiles = (await readdir(path.join(root, 'src/worker/jobs'))).filter(
  (f) => /\.ts$/.test(f) && !f.endsWith('.test.ts') && !f.startsWith('_'),
)
const entries = [
  'src/worker/index.ts',
  ...jobFiles.map((f) => `src/worker/jobs/${f}`),
  'scripts/create-first-admin.ts',
  'scripts/import-mock.ts',
  'docker/runtime/migrate.ts',
  'docker/runtime/record-audit.ts',
]

/**
 * Bundled code no longer sits where its source did, so `import.meta.url` in
 * project files is replaced by the URL the source file has inside the image
 * (/app/<path>, from the working directory, which payload.config.ts already
 * treats as the root). `new URL('../../../public', import.meta.url)` in the
 * importer and the worker's jobs folder then resolve as they do under tsx.
 */
const relocateImportMeta = {
  name: 'relocate-import-meta',
  setup(b) {
    b.onLoad({ filter: /\.(?:ts|tsx|mts|js|mjs)$/ }, async (args) => {
      if (args.path.includes(`${path.sep}node_modules${path.sep}`)) return undefined
      const source = await readFile(args.path, 'utf8')
      if (!source.includes('import.meta.url')) return undefined
      const rel = path.relative(root, args.path).split(path.sep).join('/')
      const prelude = `import { pathToFileURL as __muomalatToUrl } from 'node:url';\n`
      const url = `__muomalatToUrl(process.cwd() + ${JSON.stringify(`/${rel}`)}).href`
      const ext = path.extname(args.path).slice(1)
      return { contents: prelude + source.replaceAll('import.meta.url', url), loader: ext === 'mts' ? 'ts' : ext === 'mjs' ? 'js' : ext }
    })
  },
}

/**
 * Node's ESM loader needs the file of a package subpath (`next/server.js`)
 * unless the package maps it in `exports`; tsx and Next's bundler guess the
 * extension, Node does not. For packages without `exports` (next itself), an
 * extensionless subpath import gets its `.js` (or `/index.js`) here.
 */
const fullySpecified = {
  name: 'fully-specified-subpaths',
  setup(b) {
    b.onResolve({ filter: /^(?:@[^/]+\/)?[^./][^/]*\/./ }, (args) => {
      const m = args.path.match(/^((?:@[^/]+\/)?[^/@][^/]*)\/(.+)$/)
      if (!m || /\.(?:[cm]?js|json|node)$/.test(m[2])) return undefined
      const [, pkg, sub] = m
      const dir = path.join(root, 'node_modules', pkg)
      let manifest
      try {
        manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
      } catch {
        return undefined
      }
      if (manifest.exports) return undefined
      for (const file of [`${sub}.js`, `${sub}/index.js`]) {
        if (existsSync(path.join(dir, file))) return { path: `${pkg}/${file}`, external: true }
      }
      return undefined
    })
  },
}

await rm(out, { recursive: true, force: true })
const result = await build({
  entryPoints: entries.map((file) => ({ in: file, out: file.replace(/\.ts$/, '') })),
  outdir: out,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  packages: 'external',
  tsconfig: 'tsconfig.json',
  chunkNames: 'chunks/[name]-[hash]',
  sourcemap: 'linked',
  // Bundled CommonJS-style code may call require(); give ESM output a real one.
  banner: { js: "import { createRequire as __muomalatRequire } from 'node:module'; const require = __muomalatRequire(import.meta.url);" },
  plugins: [fullySpecified, relocateImportMeta],
  metafile: true,
  logLevel: 'warning',
})
const outputs = Object.keys(result.metafile.outputs).filter((f) => f.endsWith('.js'))
console.log(`build: bundled ${entries.length} entries into ${outputs.length} files (${jobFiles.length} worker jobs: ${jobFiles.join(', ')})`)

// ── 2. Trace the packages the bundles load ─────────────────────────────────

const { fileList, warnings } = await nodeFileTrace(
  outputs.map((f) => path.join(root, f)),
  { base: root, processCwd: root, mixedModules: true, ignore: (p) => p.startsWith('node_modules/@next/swc') || p.startsWith('node_modules/typescript/') },
)
let added = 0
let bytes = 0
for (const file of fileList) {
  if (!file.startsWith('node_modules/')) continue
  const target = path.join(standalone, file)
  if (existsSync(target)) continue
  const from = path.join(root, file)
  const info = await stat(from).catch(() => undefined)
  if (!info || info.isDirectory()) continue
  await mkdir(path.dirname(target), { recursive: true })
  await cp(from, target)
  added += 1
  bytes += info.size
}
// "Failed to resolve" are optional peers (pg-native, bufferutil, other
// platforms' sharp builds): expected. A "Cannot find module" is worth a look.
const notFound = [...warnings].map((w) => String(w?.message ?? w).split('\n')[0]).filter((m) => /Cannot find module/.test(m) && !/@img\/sharp-/.test(m))
console.log(`build: ${added} package files added to the standalone tree (${(bytes / 1048576).toFixed(1)} MB); ${warnings.size} trace warnings`)
for (const m of notFound.slice(0, 20)) console.warn(`build: trace warning: ${m}`)

// Next's trace copies the TypeScript sources (src/, scripts/) into the
// standalone tree; nothing reads them at run time, and the worker would try
// to load src/worker/jobs/*.ts beside the compiled jobs. Replace them with the
// bundles. (The OG card fonts are copied back by the Dockerfile.)
await rm(path.join(standalone, 'src'), { recursive: true, force: true })
await rm(path.join(standalone, 'scripts'), { recursive: true, force: true })
await cp(out, standalone, { recursive: true })

// ── 3. Drop the build-time (mock) prerenders ───────────────────────────────

const PRERENDERED = /\.(?:html|rsc|meta|body)$/
let removed = 0
async function strip(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.segments')) {
        await rm(full, { recursive: true, force: true })
        removed += 1
      } else await strip(full)
    } else if (PRERENDERED.test(entry.name)) {
      await rm(full, { force: true })
      removed += 1
    }
  }
}
await strip(path.join(standalone, '.next/server/app'))
console.log(`build: removed ${removed} build-time prerendered files from .next/server/app`)
