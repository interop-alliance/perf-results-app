/**
 * Where the run records live: one public Collection in a fixed Space on a PWS
 * server. The page reads it and the scripts write it, so both take the ids from
 * here.
 */

export const defaultServerUrl = 'https://freewallet.me'
export const spaceId = 'perf-results'
export const collectionId = 'runs'

/**
 * The URL of the records Collection on a server.
 *
 * @param options {object}
 * @param options.serverUrl {string}   the server's base URL, with or without a
 *   trailing slash
 * @returns {string}
 */
export function collectionUrlOf({ serverUrl }: { serverUrl: string }): string {
  return `${serverUrl.replace(/\/+$/, '')}/space/${spaceId}/${collectionId}/`
}
