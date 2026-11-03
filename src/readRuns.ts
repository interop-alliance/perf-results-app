/**
 * Reads the run records from a public Collection: unsigned `GET`s, since the
 * Collection's public-read policy lets anyone list and read it.
 */
import { isObject, isRunRecord, type Run } from './record.ts'

/**
 * What a read found: the runs, and the URLs of the Resources that are not
 * schema 1 run records.
 */
export interface RunsRead {
  runs: Run[]
  skipped: string[]
}

/**
 * Parses a URL, resolved against a base, and keeps it only when it is http or
 * https, so no record or query string can put another kind of link on the
 * page.
 *
 * @param url {string}
 * @param [base] {string}
 * @returns {string | null}   the absolute URL, or null
 */
export function webUrl(url: string, base?: string): string | null {
  const parsed = URL.parse(url, base)
  if (parsed === null || !['http:', 'https:'].includes(parsed.protocol)) {
    return null
  }
  return parsed.href
}

/**
 * @param options {object}
 * @param options.url {string}
 * @param options.fetcher {typeof fetch}
 * @returns {Promise<unknown>}   the parsed body
 */
async function fetchJson({
  url,
  fetcher
}: {
  url: string
  fetcher: typeof fetch
}): Promise<unknown> {
  const response = await fetcher(url, {
    headers: { accept: 'application/json' }
  })
  // The server answers 404 for a missing target and a refused one alike.
  if (response.status === 404) {
    throw new Error(`${url} is missing, or not public.`)
  }
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}.`)
  }
  return response.json()
}

/**
 * Lists a Collection, page by page, following each page's `next` link.
 *
 * @param options {object}
 * @param options.collectionUrl {string}
 * @param options.fetcher {typeof fetch}
 * @returns {Promise<{ id: string, url: string }[]>}   each Resource's id and
 *   absolute URL
 */
async function listCollection({
  collectionUrl,
  fetcher
}: {
  collectionUrl: string
  fetcher: typeof fetch
}): Promise<{ id: string; url: string }[]> {
  const items: { id: string; url: string }[] = []
  const visited = new Set<string>()
  let pageUrl: string | null = collectionUrl
  while (pageUrl !== null && !visited.has(pageUrl)) {
    visited.add(pageUrl)
    const page = await fetchJson({ url: pageUrl, fetcher })
    if (!isObject(page)) {
      throw new Error(`${pageUrl} is not a Collection listing.`)
    }
    for (const item of Array.isArray(page.items) ? page.items : []) {
      if (!isObject(item) || typeof item.id !== 'string') {
        continue
      }
      const url = typeof item.url === 'string' && webUrl(item.url, pageUrl)
      if (url) {
        items.push({ id: item.id, url })
      }
    }
    pageUrl = typeof page.next === 'string' ? webUrl(page.next, pageUrl) : null
  }
  return items
}

/**
 * Reads every run record in a Collection: the listing, then the records, a
 * few at a time.
 *
 * @param options {object}
 * @param options.collectionUrl {string}
 * @param [options.fetcher] {typeof fetch}   the fetch to use; tests pass
 *   their own
 * @param [options.readers] {number}   how many records are fetched at once
 * @returns {Promise<RunsRead>}
 */
export async function readRuns({
  collectionUrl,
  fetcher = globalThis.fetch.bind(globalThis),
  readers = 6
}: {
  collectionUrl: string
  fetcher?: typeof fetch
  readers?: number
}): Promise<RunsRead> {
  const items = await listCollection({ collectionUrl, fetcher })
  const runs: Run[] = []
  const skipped: string[] = []
  let next = 0
  async function reader(): Promise<void> {
    for (let item = items[next++]; item; item = items[next++]) {
      const record = await fetchJson({ url: item.url, fetcher })
      if (isRunRecord(record)) {
        runs.push({ ...record, id: item.id, url: item.url })
      } else {
        skipped.push(item.url)
      }
    }
  }
  await Promise.all(Array.from({ length: readers }, reader))
  return { runs, skipped }
}
