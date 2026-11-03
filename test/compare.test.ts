import { describe, expect, it } from 'vitest'
import {
  change,
  compareRows,
  compareText,
  direction,
  settingsDifferences,
  verdictOf
} from '../src/compare.ts'
import { makeRun, sizeResult } from './fixtures.ts'

describe('change', () => {
  it('is the percent change from A to B', () => {
    expect(change(100, 120)).toBe(20)
    expect(change(200, 150)).toBe(-25)
  })

  it('is null when a value is missing or A is 0', () => {
    expect(change(undefined, 10)).toBeNull()
    expect(change(10, null)).toBeNull()
    expect(change(0, 10)).toBeNull()
  })
})

describe('direction', () => {
  it('calls a change past the threshold good or bad', () => {
    expect(direction(15, { higherIsBetter: true, threshold: 10 })).toBe('good')
    expect(direction(15, { higherIsBetter: false, threshold: 10 })).toBe('bad')
    expect(direction(-15, { higherIsBetter: false, threshold: 10 })).toBe(
      'good'
    )
  })

  it('says nothing under the threshold', () => {
    expect(direction(9, { higherIsBetter: true, threshold: 10 })).toBe('')
    expect(direction(null, { higherIsBetter: true, threshold: 10 })).toBe('')
  })
})

describe('verdictOf', () => {
  const result = sizeResult({
    test: 'public-read',
    size: 1,
    rate: 30,
    avgMs: 160
  })

  it('names a measurement only one run has', () => {
    expect(
      verdictOf({
        resultA: undefined,
        resultB: result,
        rateTrend: '',
        latencyTrend: ''
      })
    ).toBe('only in B')
  })

  it('is mixed when the rate and the latency disagree', () => {
    expect(
      verdictOf({
        resultA: result,
        resultB: result,
        rateTrend: 'good',
        latencyTrend: 'bad'
      })
    ).toBe('mixed')
  })

  it('counts more failures in B as worse', () => {
    expect(
      verdictOf({
        resultA: result,
        resultB: { ...result, failed: 3 },
        rateTrend: '',
        latencyTrend: ''
      })
    ).toBe('worse')
  })
})

describe('compareRows', () => {
  it('compares each measurement on each backend', () => {
    const runA = makeRun({
      id: 'a',
      results: [
        sizeResult({ test: 'signed-write', size: 1, rate: 10, avgMs: 500 }),
        sizeResult({
          test: 'signed-write',
          size: 1,
          backend: 'fs',
          rate: 5,
          avgMs: 160
        })
      ]
    })
    const runB = makeRun({
      id: 'b',
      results: [
        sizeResult({ test: 'signed-write', size: 1, rate: 15, avgMs: 340 })
      ]
    })

    const rows = compareRows({ runA, runB, threshold: 10 })

    expect(
      rows.map(row => [row.measurement.label, row.backend, row.verdict])
    ).toEqual([
      ['Signed write, size 1', 'all', 'better'],
      ['Signed write, size 1', 'fs', 'only in A']
    ])
    expect(rows[0]?.rateChange).toBe(50)
  })
})

describe('settingsDifferences', () => {
  it('ignores the order a split lists its backends in', () => {
    const runA = makeRun({ settings: { split: { postgres: 50, fs: 50 } } })
    const runB = makeRun({ settings: { split: { fs: 50, postgres: 50 } } })
    expect(settingsDifferences({ runA, runB })).toEqual([])
  })

  it('names each setting that differs', () => {
    const runA = makeRun({ settings: { clients: 5, payloads: ['json'] } })
    const runB = makeRun({
      settings: { clients: 10, payloads: ['json', 'small'] }
    })
    expect(settingsDifferences({ runA, runB })).toEqual([
      'clients: 5 in A, 10 in B',
      'payloads: json in A, json, small in B'
    ])
  })
})

describe('compareText', () => {
  it('writes a header naming both runs, then a tab-separated row each', () => {
    const runA = makeRun({ id: 'a' })
    const runB = makeRun({ id: 'b' })
    const rows = compareRows({ runA, runB, threshold: 10 })

    const lines = compareText({ runA, runB, rows, threshold: 10 }).split('\n')

    expect(lines[0]).toBe(
      '# A: a, server 0.45.0 built 2026-10-30 19:05 UTC, run time 34 min'
    )
    expect(lines[3]?.split('\t')[0]).toBe('test')
    expect(lines[4]?.split('\t')).toEqual([
      'Public read, size 1',
      'all',
      '30',
      '30',
      '0%',
      '160',
      '160',
      '0%',
      '0',
      '0',
      ''
    ])
  })
})
