/**
 * The run record `pnpm perf:remote --record` writes (schema 1), and the id each
 * one is stored under in the records Collection. Shared by the page and the
 * scripts, so it uses neither the DOM nor Node.
 */

/**
 * One measurement of a run: a test at one Collection size (suite `sizes`) or
 * one payload of the matrix (suite `matrix`), for the whole test (backend
 * `all`) or for the Collections on one backend.
 */
export interface RunResult {
  suite: string
  test: string
  size?: number
  category?: string
  payload?: string
  backend: string
  rate?: number | null
  avg_ms?: number | null
  failed?: number
  skipped?: boolean
}

/**
 * The load settings a run used.
 */
export interface RunSettings {
  clients?: number
  large_file_clients?: number
  duration_s?: number
  serial_writes?: number
  sizes?: number[]
  payloads?: string[]
  split?: Record<string, number>
}

/**
 * A schema 1 run record, as the file holds it. Members this app does not read
 * (`machine`, the rest of `tool`) are kept as they are.
 */
export interface RunRecord {
  schema: 1
  datetime: string
  finished_at?: string
  spaces_url: string
  server_version?: string | null
  server_built_at?: string | null
  runner: string
  label?: string
  tool?: { commit?: string }
  settings: RunSettings
  results: RunResult[]
}

/**
 * A run record as the page read it: the record, its id in the Collection, and
 * the URL it was read from.
 */
export interface Run extends RunRecord {
  id: string
  url: string
}

// The server's id rule (`ID_PATTERN` in the server's `validateId.ts`).
const idPattern = /^[A-Za-z0-9._~-]+$/

/**
 * Whether a value is a plain object, so its members can be read.
 *
 * @param value {unknown}
 * @returns {boolean}
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether a value is a schema 1 run record with the members this app reads.
 *
 * @param value {unknown}
 * @returns {boolean}
 */
export function isRunRecord(value: unknown): value is RunRecord {
  return (
    isObject(value) &&
    value.schema === 1 &&
    typeof value.datetime === 'string' &&
    typeof value.runner === 'string' &&
    typeof value.spaces_url === 'string' &&
    URL.canParse(value.spaces_url) &&
    isObject(value.settings) &&
    Array.isArray(value.results)
  )
}

/**
 * The host a run measured, as its series names it: the host name, with the
 * port as `-<port>` when the URL carries one.
 *
 * @param options {object}
 * @param options.spacesUrl {string}   the record's `spaces_url`
 * @returns {string}
 */
export function hostOf({ spacesUrl }: { spacesUrl: string }): string {
  const { hostname, port } = new URL(spacesUrl)
  return port === '' ? hostname : `${hostname}-${port}`
}

/**
 * A run's start as the record files name it: `2026-11-03T154756Z` for
 * `2026-11-03T15:47:56.491Z`.
 *
 * @param options {object}
 * @param options.datetime {string}   the record's `datetime`
 * @returns {string}
 */
export function stampOf({ datetime }: { datetime: string }): string {
  return `${datetime.slice(0, 19).replaceAll(':', '')}Z`
}

/**
 * The id a record is stored under: `<runner>~<host>~<stamp>`, such as
 * `laptop-omar~freewallet.me~2026-11-03T154756Z`.
 *
 * @param options {object}
 * @param options.record {RunRecord}
 * @returns {string}
 */
export function recordId({ record }: { record: RunRecord }): string {
  const host = hostOf({ spacesUrl: record.spaces_url })
  return `${record.runner}~${host}~${stampOf({ datetime: record.datetime })}`
}

/**
 * Whether the server accepts an id.
 *
 * @param options {object}
 * @param options.id {string}
 * @returns {boolean}
 */
export function isValidId({ id }: { id: string }): boolean {
  return idPattern.test(id)
}
