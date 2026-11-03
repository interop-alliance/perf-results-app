/**
 * The server and the key the scripts use, from the environment, which the
 * pnpm scripts load from `.env`.
 */
import { PwsClient } from '@interop/pws-client'
import { agentsFromSecret } from '@interop/pws-client/identity'
import { collectionUrlOf, defaultServerUrl } from '../src/collection.ts'

/**
 * The PWS server that holds the run records: `PERF_RESULTS_SERVER`, else
 * production.
 *
 * @returns {string}
 */
export function serverUrl(): string {
  const url = process.env.PERF_RESULTS_SERVER?.trim() || defaultServerUrl
  return url.replace(/\/+$/, '')
}

/**
 * The records Collection on that server.
 *
 * @returns {string}
 */
export function collectionUrl(): string {
  return collectionUrlOf({ serverUrl: serverUrl() })
}

/**
 * The secret in `PERF_RESULTS_SECRET`, or undefined when it is unset or
 * blank.
 *
 * @returns {string | undefined}
 */
export function configuredSecret(): string | undefined {
  const secret = process.env.PERF_RESULTS_SECRET?.trim()
  return secret === '' ? undefined : secret
}

/**
 * A client signing as the key `PERF_RESULTS_SECRET` derives, the controller
 * of the results Space.
 *
 * @returns {Promise<{ pws: PwsClient, did: string }>}
 */
export async function connect(): Promise<{ pws: PwsClient; did: string }> {
  const secret = configuredSecret()
  if (secret === undefined) {
    throw new Error(
      'Set PERF_RESULTS_SECRET: run pnpm new-key, which writes one to .env.'
    )
  }
  const agents = await agentsFromSecret({ secret })
  const pws = new PwsClient({
    baseServerUrl: serverUrl(),
    zcapClient: agents.zcapClient
  })
  return { pws, did: agents.controllerDid }
}
