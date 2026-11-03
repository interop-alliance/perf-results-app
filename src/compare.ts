/**
 * Two runs side by side: each measurement's change from A to B, whether it is
 * good news past a threshold, and the comparison as text to paste elsewhere.
 */
import { formatDate } from './format.ts'
import {
  backends,
  measurementsOf,
  resultOf,
  type Backend,
  type Measurement
} from './measurements.ts'
import type { Run, RunResult, RunSettings } from './record.ts'
import { describeSplit, formatMinutes, sortedSplit } from './runInfo.ts'

/**
 * Whether a change past the threshold is good news, bad news, or neither.
 */
export type Trend = '' | 'good' | 'bad'

export type Verdict =
  | ''
  | 'better'
  | 'worse'
  | 'mixed'
  | 'only in A'
  | 'only in B'
  | 'skipped in one'

/**
 * One measurement on one backend, in A and in B.
 */
export interface CompareRow {
  measurement: Measurement
  backend: Backend
  resultA: RunResult | undefined
  resultB: RunResult | undefined
  rateChange: number | null
  latencyChange: number | null
  rateTrend: Trend
  latencyTrend: Trend
  verdict: Verdict
}

/**
 * The percent change from one value to another, or null when either is
 * missing or the first is 0.
 *
 * @param before {number | null | undefined}
 * @param after {number | null | undefined}
 * @returns {number | null}
 */
export function change(
  before: number | null | undefined,
  after: number | null | undefined
): number | null {
  if (typeof before !== 'number' || typeof after !== 'number') {
    return null
  }
  if (before === 0) {
    return null
  }
  return ((after - before) / before) * 100
}

/**
 * Whether a change past the threshold is good news: a higher rate or a lower
 * latency is.
 *
 * @param percent {number | null}
 * @param options {object}
 * @param options.higherIsBetter {boolean}
 * @param options.threshold {number}   in percent
 * @returns {Trend}
 */
export function direction(
  percent: number | null,
  { higherIsBetter, threshold }: { higherIsBetter: boolean; threshold: number }
): Trend {
  if (percent === null || percent === 0 || Math.abs(percent) < threshold) {
    return ''
  }
  return percent > 0 === higherIsBetter ? 'good' : 'bad'
}

/**
 * One measurement's verdict: better, worse or mixed past the threshold, more
 * failures counting as worse, or why it cannot be compared.
 *
 * @param options {object}
 * @param options.resultA {RunResult | undefined}
 * @param options.resultB {RunResult | undefined}
 * @param options.rateTrend {Trend}
 * @param options.latencyTrend {Trend}
 * @returns {Verdict}
 */
export function verdictOf({
  resultA,
  resultB,
  rateTrend,
  latencyTrend
}: {
  resultA: RunResult | undefined
  resultB: RunResult | undefined
  rateTrend: Trend
  latencyTrend: Trend
}): Verdict {
  if (resultA === undefined) {
    return 'only in B'
  }
  if (resultB === undefined) {
    return 'only in A'
  }
  if (resultA.skipped || resultB.skipped) {
    return resultA.skipped && resultB.skipped ? '' : 'skipped in one'
  }
  const signals: Trend[] = [rateTrend, latencyTrend]
  if ((resultB.failed ?? 0) > (resultA.failed ?? 0)) {
    signals.push('bad')
  }
  if (signals.includes('good') && signals.includes('bad')) {
    return 'mixed'
  }
  if (signals.includes('bad')) {
    return 'worse'
  }
  if (signals.includes('good')) {
    return 'better'
  }
  return ''
}

/**
 * Every measurement either run has, on every backend, in the order B then A
 * recorded them.
 *
 * @param options {object}
 * @param options.runA {Run}   the baseline
 * @param options.runB {Run}   the run compared with it
 * @param options.threshold {number}   in percent
 * @returns {CompareRow[]}
 */
export function compareRows({
  runA,
  runB,
  threshold
}: {
  runA: Run
  runB: Run
  threshold: number
}): CompareRow[] {
  const rows: CompareRow[] = []
  for (const measurement of measurementsOf([runB, runA])) {
    for (const backend of backends) {
      const resultA = resultOf({ run: runA, key: measurement.key, backend })
      const resultB = resultOf({ run: runB, key: measurement.key, backend })
      if (resultA === undefined && resultB === undefined) {
        continue
      }
      const rateChange = change(resultA?.rate, resultB?.rate)
      const latencyChange = change(resultA?.avg_ms, resultB?.avg_ms)
      const rateTrend = direction(rateChange, {
        higherIsBetter: true,
        threshold
      })
      const latencyTrend = direction(latencyChange, {
        higherIsBetter: false,
        threshold
      })
      rows.push({
        measurement,
        backend,
        resultA,
        resultB,
        rateChange,
        latencyChange,
        rateTrend,
        latencyTrend,
        verdict: verdictOf({ resultA, resultB, rateTrend, latencyTrend })
      })
    }
  }
  return rows
}

// The settings the warning compares, with the names it gives them.
const settingNames: [keyof RunSettings, string][] = [
  ['clients', 'clients'],
  ['large_file_clients', '10 MiB test clients'],
  ['duration_s', 'seconds per test'],
  ['serial_writes', 'serial writes'],
  ['sizes', 'Collection sizes'],
  ['payloads', 'payloads'],
  ['split', 'backend split']
]

/**
 * @param value {RunSettings[keyof RunSettings]}
 * @returns {string}   a setting as the settings warning names it
 */
function describeSetting(value: RunSettings[keyof RunSettings]): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return describeSplit(value) || 'none'
  }
  return String(value)
}

/**
 * @param value {RunSettings[keyof RunSettings]}
 * @returns {string}   a setting in a form two runs compare equal in
 */
function comparableSetting(value: RunSettings[keyof RunSettings]): string {
  if (typeof value === 'object' && !Array.isArray(value)) {
    return JSON.stringify(sortedSplit(value))
  }
  return JSON.stringify(value)
}

/**
 * The load settings two runs differ in, one sentence each.
 *
 * @param options {object}
 * @param options.runA {Run}
 * @param options.runB {Run}
 * @returns {string[]}
 */
export function settingsDifferences({
  runA,
  runB
}: {
  runA: Run
  runB: Run
}): string[] {
  return settingNames
    .filter(
      ([field]) =>
        comparableSetting(runA.settings[field]) !==
        comparableSetting(runB.settings[field])
    )
    .map(
      ([field, name]) =>
        `${name}: ${describeSetting(runA.settings[field])} in A, ${describeSetting(runB.settings[field])} in B`
    )
}

/**
 * @param value {number | undefined | null}
 * @returns {string}   one decimal, or empty
 */
function roundForText(value: number | undefined | null): string {
  return typeof value === 'number' ? String(Math.round(value * 10) / 10) : ''
}

/**
 * The comparison as tab-separated text, with a header naming both runs.
 *
 * @param options {object}
 * @param options.runA {Run}
 * @param options.runB {Run}
 * @param options.rows {CompareRow[]}
 * @param options.threshold {number}
 * @returns {string}
 */
export function compareText({
  runA,
  runB,
  rows,
  threshold
}: {
  runA: Run
  runB: Run
  rows: CompareRow[]
  threshold: number
}): string {
  const percent = (value: number | null): string =>
    value === null ? '' : `${Math.round(value)}%`
  const lines = [
    `# A: ${runA.id}, server ${runA.server_version ?? 'from source'} built ${formatDate(runA.server_built_at)}, run time ${formatMinutes(runA)}`,
    `# B: ${runB.id}, server ${runB.server_version ?? 'from source'} built ${formatDate(runB.server_built_at)}, run time ${formatMinutes(runB)}`,
    `# change = (B - A) / A; a higher rate and a lower avg_ms are better; threshold ${threshold}%`,
    [
      'test',
      'backend',
      'rate_a',
      'rate_b',
      'rate_change',
      'ms_a',
      'ms_b',
      'ms_change',
      'failed_a',
      'failed_b',
      'verdict'
    ].join('\t')
  ]
  for (const row of rows) {
    lines.push(
      [
        row.measurement.label,
        row.backend,
        roundForText(row.resultA?.rate),
        roundForText(row.resultB?.rate),
        percent(row.rateChange),
        roundForText(row.resultA?.avg_ms),
        roundForText(row.resultB?.avg_ms),
        percent(row.latencyChange),
        row.resultA?.failed ?? '',
        row.resultB?.failed ?? '',
        row.verdict
      ].join('\t')
    )
  }
  return `${lines.join('\n')}\n`
}
