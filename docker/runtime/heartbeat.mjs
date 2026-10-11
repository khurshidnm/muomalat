/**
 * Preloaded into the worker (`node --import`, docker/runtime/muomalat): while
 * the worker's event loop runs, it rewrites HEARTBEAT_FILE every 15 seconds.
 * The container healthcheck (`muomalat healthcheck worker`) reports a stale
 * file, so a worker stuck in a busy loop shows as unhealthy. A slow job does
 * not: the jobs never block the loop while they wait.
 */
import { writeFileSync } from 'node:fs'

const file = process.env.HEARTBEAT_FILE || '/tmp/muomalat-worker.heartbeat'
const beat = () => {
  try {
    writeFileSync(file, String(Date.now()))
  } catch {
    // A read-only /tmp only costs the healthcheck; never the worker.
  }
}
beat()
setInterval(beat, 15_000).unref()
