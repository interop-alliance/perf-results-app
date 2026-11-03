/**
 * The measurements in run records: what each one is called, and how to look a
 * value up by measurement, backend and metric.
 */
import type { RunRecord, RunResult } from './record.ts'

export const backends = ['all', 'postgres', 'fs'] as const
export type Backend = (typeof backends)[number]

export const backendNames: Record<Backend, string> = {
  all: 'whole test',
  postgres: 'postgres',
  fs: 'fs'
}

/**
 * What a chart or a table shows of a measurement: requests (or files) per
 * second, or the average latency.
 */
export type Metric = 'rate' | 'avg_ms'

/**
 * The two test suites: one test at several Collection sizes, or one file of
 * each payload kind.
 */
export type Suite = 'sizes' | 'matrix'

const testNames: Record<string, string> = {
  'public-read': 'Public read',
  'public-list': 'Public list',
  'signed-read': 'Signed read',
  'signed-write': 'Signed write',
  'signed-delete': 'Signed delete',
  'serial-write': 'Serial write, 1 client'
}

const payloadNames: Record<string, string> = {
  json: 'JSON',
  small: '100 KiB',
  large: '10 MiB'
}

/**
 * One measurement across runs, whatever the backend.
 */
export interface Measurement {
  key: string
  suite: string
  label: string
  unit: string
}

/**
 * The key a measurement has in every run: its suite, test, size, category and
 * payload.
 *
 * @param result {RunResult}
 * @returns {string}
 */
export function measurementKey(result: RunResult): string {
  return [
    result.suite,
    result.test,
    result.size ?? '',
    result.category ?? '',
    result.payload ?? ''
  ].join('|')
}

/**
 * @param result {RunResult}
 * @returns {string}   such as `Public read, size 500` or `Read 100 KiB, plaintext`
 */
export function measurementLabel(result: RunResult): string {
  if (result.suite === 'sizes') {
    return `${testNames[result.test] ?? result.test}, size ${result.size}`
  }
  const test = result.test.charAt(0).toUpperCase() + result.test.slice(1)
  const payload = result.payload ?? ''
  return `${test} ${payloadNames[payload] ?? payload}, ${result.category}`
}

const resultIndexes = new WeakMap<
  RunRecord,
  Map<string, Map<string, RunResult>>
>()

/**
 * A run's results by measurement key, then backend; built once per run.
 *
 * @param run {RunRecord}
 * @returns {Map<string, Map<string, RunResult>>}
 */
function resultIndex(run: RunRecord): Map<string, Map<string, RunResult>> {
  const cached = resultIndexes.get(run)
  if (cached !== undefined) {
    return cached
  }
  const index = new Map<string, Map<string, RunResult>>()
  for (const result of run.results) {
    const key = measurementKey(result)
    const byBackend = index.get(key) ?? new Map<string, RunResult>()
    byBackend.set(result.backend, result)
    index.set(key, byBackend)
  }
  resultIndexes.set(run, index)
  return index
}

/**
 * @param options {object}
 * @param options.run {RunRecord}
 * @param options.key {string}   the measurement key
 * @param options.backend {string}
 * @returns {RunResult | undefined}
 */
export function resultOf({
  run,
  key,
  backend
}: {
  run: RunRecord
  key: string
  backend: string
}): RunResult | undefined {
  return resultIndex(run).get(key)?.get(backend)
}

/**
 * @param options {object}
 * @param options.run {RunRecord}
 * @param options.key {string}   the measurement key
 * @param options.backend {string}
 * @param options.metric {Metric}
 * @returns {number | null}   null when the run has no such number
 */
export function valueOf({
  run,
  key,
  backend,
  metric
}: {
  run: RunRecord
  key: string
  backend: string
  metric: Metric
}): number | null {
  const value = resultOf({ run, key, backend })?.[metric]
  return typeof value === 'number' ? value : null
}

/**
 * The measurements in a set of runs, in the order they were first recorded.
 *
 * @param runs {RunRecord[]}
 * @returns {Measurement[]}
 */
export function measurementsOf(runs: RunRecord[]): Measurement[] {
  const found = new Map<string, Measurement>()
  for (const run of runs) {
    for (const result of run.results) {
      const key = measurementKey(result)
      if (found.has(key)) {
        continue
      }
      found.set(key, {
        key,
        suite: result.suite,
        label: measurementLabel(result),
        unit: result.suite === 'matrix' ? 'files/s' : 'req/s'
      })
    }
  }
  return [...found.values()]
}
