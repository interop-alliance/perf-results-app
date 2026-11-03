/**
 * What the page says about a run as a whole: how long it took, its load
 * settings, its place in its series, and the series the runs form.
 */
import { formatDate } from './format.ts'
import { hostOf, type Run, type RunRecord } from './record.ts'

/**
 * How long a run took, in whole minutes, from its start to the end of its
 * measurements; null for a record made before `finished_at` was recorded.
 *
 * @param run {RunRecord}
 * @returns {number | null}
 */
export function runMinutes(run: RunRecord): number | null {
  if (!run.finished_at) {
    return null
  }
  const took = Date.parse(run.finished_at) - Date.parse(run.datetime)
  return Math.round(took / 60_000)
}

/**
 * @param run {RunRecord}
 * @returns {string}   `34 min`, or `not recorded`
 */
export function formatMinutes(run: RunRecord): string {
  const minutes = runMinutes(run)
  return minutes === null ? 'not recorded' : `${minutes} min`
}

/**
 * A run's place in its series: the server build it measured, then the run's
 * own start. A server run from source reports no build time.
 *
 * @param run {RunRecord}
 * @returns {string}
 */
export function orderKey(run: RunRecord): string {
  return `${run.server_built_at ?? run.datetime} ${run.datetime}`
}

/**
 * A run's short name under a chart: its server version and build day.
 *
 * @param run {RunRecord}
 * @returns {string}   such as `0.45.0 (10-30)`
 */
export function shortRun(run: RunRecord): string {
  const date = (run.server_built_at ?? run.datetime).slice(5, 10)
  return `${run.server_version ?? 'source'} (${date})`
}

/**
 * A run's name in a run picker: its start, server, run time and label.
 *
 * @param run {RunRecord}
 * @returns {string}
 */
export function optionLabel(run: RunRecord): string {
  const label = run.label ? `, ${run.label}` : ''
  const minutes = runMinutes(run)
  const took = minutes === null ? '' : `, ${minutes} min`
  return `${formatDate(run.datetime)}: server ${run.server_version ?? 'from source'}${took}${label}`
}

/**
 * A backend split with its backends in name order, so two splits compare
 * equal whatever order their records list them in.
 *
 * @param split {Record<string, number> | undefined}
 * @returns {Record<string, number>}
 */
export function sortedSplit(
  split: Record<string, number> | undefined
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(split ?? {}).sort(([first], [second]) =>
      first.localeCompare(second)
    )
  )
}

/**
 * The settings that change what every measurement means, as one string. Runs
 * that differ in them are not one series.
 *
 * @param run {RunRecord}
 * @returns {string}
 */
export function loadSettings(run: RunRecord): string {
  const { clients, large_file_clients, duration_s, split } = run.settings
  return JSON.stringify({
    clients,
    large_file_clients,
    duration_s,
    split: sortedSplit(split)
  })
}

/**
 * @param split {Record<string, number> | undefined}
 * @returns {string}   such as `postgres 50%, fs 50%`, or empty for no split
 */
export function describeSplit(
  split: Record<string, number> | undefined
): string {
  return Object.entries(split ?? {})
    .map(([backend, percent]) => `${backend} ${percent}%`)
    .join(', ')
}

/**
 * @param run {RunRecord}
 * @returns {string}   such as `5 clients, 10 s per test, split postgres 50%, fs 50%`
 */
export function describeSettings(run: RunRecord): string {
  const { clients, duration_s, split } = run.settings
  return `${clients ?? '?'} clients, ${duration_s ?? '?'} s per test, split ${describeSplit(split) || 'none'}`
}

/**
 * The series a run belongs to: its runner and the host it measured.
 *
 * @param run {RunRecord}
 * @returns {string}   such as `laptop-omar / freewallet.me`
 */
export function seriesNameOf(run: RunRecord): string {
  return `${run.runner} / ${hostOf({ spacesUrl: run.spaces_url })}`
}

/**
 * Groups runs into series, each in build order, and names the series of the
 * newest run.
 *
 * @param runs {Run[]}
 * @returns {{ series: Map<string, Run[]>, newest: string | null }}
 */
export function groupSeries(runs: Run[]): {
  series: Map<string, Run[]>
  newest: string | null
} {
  const series = new Map<string, Run[]>()
  for (const run of runs) {
    const name = seriesNameOf(run)
    series.set(name, [...(series.get(name) ?? []), run])
  }
  for (const members of series.values()) {
    members.sort((first, second) =>
      orderKey(first).localeCompare(orderKey(second))
    )
  }
  let newestRun: Run | undefined
  for (const run of runs) {
    if (newestRun === undefined || run.datetime > newestRun.datetime) {
      newestRun = run
    }
  }
  return {
    series,
    newest: newestRun === undefined ? null : seriesNameOf(newestRun)
  }
}
