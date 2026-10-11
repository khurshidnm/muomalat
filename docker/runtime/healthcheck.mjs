/**
 * Container healthchecks (docker/compose.prod.yml):
 *
 *   muomalat healthcheck app      the Next server answers on 127.0.0.1:$PORT
 *   muomalat healthcheck worker   the worker's heartbeat file is under 60 s old
 *
 * Exit 0 when healthy, 1 otherwise. The app check asks for /favicon.ico, a
 * static file that needs neither the database nor a host rule, so it shows
 * whether the server is up, not whether every page renders; the smoke tests
 * after a deploy cover the rest (docs/DEPLOY.md).
 */
import { statSync } from 'node:fs'
import http from 'node:http'

const mode = process.argv[2] ?? 'app'

if (mode === 'worker') {
  const file = process.env.HEARTBEAT_FILE || '/tmp/muomalat-worker.heartbeat'
  try {
    const age = Date.now() - statSync(file).mtimeMs
    process.exit(age < 60_000 ? 0 : 1)
  } catch {
    process.exit(1)
  }
} else if (mode === 'app') {
  const req = http.get({ host: '127.0.0.1', port: Number(process.env.PORT) || 3000, path: '/favicon.ico', timeout: 4000 }, (res) => {
    res.resume()
    process.exit(res.statusCode === 200 ? 0 : 1)
  })
  req.on('timeout', () => req.destroy(new Error('timeout')))
  req.on('error', () => process.exit(1))
} else {
  console.error('Usage: muomalat healthcheck app|worker')
  process.exit(2)
}
