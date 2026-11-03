/**
 * Makes the key that writes the run records: 32 random bytes, appended to
 * `.env` as `PERF_RESULTS_SECRET` (base64url text), and prints the `did:key`
 * it derives. The secret itself is never printed. An existing key is kept: a
 * new one would be a different controller, locked out of the Space.
 *
 * Usage: pnpm new-key
 */
import { randomBytes } from 'node:crypto'
import { appendFile, chmod } from 'node:fs/promises'
import { agentsFromSecret } from '@interop/pws-client/identity'
import { configuredSecret } from './config.ts'

const envFile = new URL('../.env', import.meta.url)

const existing = configuredSecret()
if (existing !== undefined) {
  const { controllerDid } = await agentsFromSecret({ secret: existing })
  console.log(`.env already holds a key, kept as it is: ${controllerDid}`)
} else {
  const secret = randomBytes(32).toString('base64url')
  await appendFile(envFile, `PERF_RESULTS_SECRET=${secret}\n`, { mode: 0o600 })
  await chmod(envFile, 0o600)
  const { controllerDid } = await agentsFromSecret({ secret })
  console.log(`Wrote a new key to .env: ${controllerDid}`)
  console.log('Keep a copy of .env somewhere safe: the key controls the Space.')
}
