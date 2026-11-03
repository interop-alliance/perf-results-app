import { describe, expect, it } from 'vitest'
import {
  formatChange,
  formatDate,
  formatNumber,
  plural
} from '../src/format.ts'
import { measurementsOf, valueOf } from '../src/measurements.ts'
import {
  describeSettings,
  groupSeries,
  loadSettings,
  runMinutes
} from '../src/runInfo.ts'
import { niceCeiling } from '../src/scale.ts'
import { makeRun, sizeResult } from './fixtures.ts'

describe('runMinutes', () => {
  it('is the whole minutes from the start to finished_at', () => {
    expect(runMinutes(makeRun())).toBe(34)
  })

  it('is null for a record without finished_at', () => {
    expect(runMinutes(makeRun({ finished_at: undefined }))).toBeNull()
  })
})

describe('loadSettings', () => {
  it('ignores the order a split lists its backends in', () => {
    const first = makeRun({ settings: { split: { postgres: 50, fs: 50 } } })
    const second = makeRun({ settings: { split: { fs: 50, postgres: 50 } } })
    expect(loadSettings(first)).toBe(loadSettings(second))
  })

  it('tells runs with other clients apart', () => {
    const first = makeRun({ settings: { clients: 5 } })
    const second = makeRun({ settings: { clients: 10 } })
    expect(loadSettings(first)).not.toBe(loadSettings(second))
  })
})

describe('describeSettings', () => {
  it('reads the clients, the duration and the split', () => {
    expect(describeSettings(makeRun())).toBe(
      '5 clients, 10 s per test, split postgres 50%, fs 50%'
    )
  })
})

describe('groupSeries', () => {
  it('groups by runner and host, in build order, and names the newest series', () => {
    const older = makeRun({
      id: 'older',
      server_built_at: '2026-10-01T00:00:00Z',
      datetime: '2026-11-03T10:00:00.000Z'
    })
    const newer = makeRun({
      id: 'newer',
      server_built_at: '2026-10-30T00:00:00Z',
      datetime: '2026-11-01T10:00:00.000Z'
    })
    const staging = makeRun({
      id: 'staging',
      spaces_url: 'https://staging.freewallet.me/spaces/',
      datetime: '2026-10-29T17:16:56.000Z'
    })

    const { series, newest } = groupSeries([newer, staging, older])

    expect([...series.keys()]).toEqual([
      'laptop-omar / freewallet.me',
      'laptop-omar / staging.freewallet.me'
    ])
    expect(
      series.get('laptop-omar / freewallet.me')?.map(run => run.id)
    ).toEqual(['older', 'newer'])
    expect(newest).toBe('laptop-omar / freewallet.me')
  })

  it('names no series when there are no runs', () => {
    expect(groupSeries([]).newest).toBeNull()
  })
})

describe('measurements', () => {
  it('looks a value up by measurement, backend and metric', () => {
    const run = makeRun({
      results: [
        sizeResult({ test: 'public-list', size: 500, rate: 24.6, avgMs: 198 }),
        sizeResult({
          test: 'public-list',
          size: 500,
          backend: 'fs',
          rate: 12.3,
          avgMs: 196
        })
      ]
    })
    const [measurement] = measurementsOf([run])

    expect(measurement?.label).toBe('Public list, size 500')
    const key = measurement?.key ?? ''
    expect(valueOf({ run, key, backend: 'fs', metric: 'rate' })).toBe(12.3)
    expect(
      valueOf({ run, key, backend: 'postgres', metric: 'rate' })
    ).toBeNull()
  })
})

describe('format', () => {
  it('rounds a number to its size', () => {
    expect(formatNumber(1181.82)).toBe('1,182')
    expect(formatNumber(30.18)).toBe('30.2')
    expect(formatNumber(0.456)).toBe('0.46')
    expect(formatNumber(null)).toBe('--')
  })

  it('signs a change', () => {
    expect(formatChange(21.4)).toBe('+21%')
    expect(formatChange(-4.52)).toBe('-4.5%')
    expect(formatChange(null)).toBe('--')
  })

  it('names counts and dates', () => {
    expect(plural(1, 'run')).toBe('1 run')
    expect(plural(2, 'run')).toBe('2 runs')
    expect(formatDate('2026-11-03T15:47:56.491Z')).toBe('2026-11-03 15:47 UTC')
  })

  it('tops a chart scale at a round number', () => {
    expect(niceCeiling(31.6)).toBe(50)
    expect(niceCeiling(0)).toBe(1)
    expect(niceCeiling(210)).toBe(250)
  })
})
