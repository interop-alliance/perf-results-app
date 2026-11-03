/**
 * Run records for the tests, built from a few numbers.
 */
import type { Run, RunResult } from '../src/record.ts'

/**
 * A sizes-suite result.
 *
 * @param options {object}
 * @param options.test {string}
 * @param options.size {number}
 * @param [options.backend] {string}
 * @param options.rate {number}
 * @param options.avgMs {number}
 * @param [options.failed] {number}
 * @returns {RunResult}
 */
export function sizeResult({
  test,
  size,
  backend = 'all',
  rate,
  avgMs,
  failed = 0
}: {
  test: string
  size: number
  backend?: string
  rate: number
  avgMs: number
  failed?: number
}): RunResult {
  return { suite: 'sizes', test, size, backend, rate, avg_ms: avgMs, failed }
}

/**
 * A run of the laptop-omar runner against freewallet.me, with the given
 * changes.
 *
 * @param [changes] {Partial<Run>}
 * @returns {Run}
 */
export function makeRun(changes: Partial<Run> = {}): Run {
  return {
    schema: 1,
    datetime: '2026-11-03T15:47:56.491Z',
    finished_at: '2026-11-03T16:22:14.960Z',
    spaces_url: 'https://freewallet.me/spaces/',
    server_version: '0.45.0',
    server_built_at: '2026-10-30T19:05:15Z',
    runner: 'laptop-omar',
    label: 'Production 0.45.0',
    tool: { commit: '55174d5' },
    settings: {
      clients: 5,
      duration_s: 10,
      payloads: ['json', 'small'],
      split: { postgres: 50, fs: 50 }
    },
    results: [
      sizeResult({ test: 'public-read', size: 1, rate: 30, avgMs: 160 })
    ],
    id: 'laptop-omar~freewallet.me~2026-11-03T154756Z',
    url: 'https://freewallet.me/space/perf-results/runs/laptop-omar~freewallet.me~2026-11-03T154756Z',
    ...changes
  }
}
