/**
 * The Over time tab: every measurement across the series, as charts or as a
 * table, for the runs that share one set of load settings.
 */
import { el } from '../dom.ts'
import { formatNumber, plural } from '../format.ts'
import {
  backendNames,
  backends,
  measurementsOf,
  resultOf,
  valueOf,
  type Measurement,
  type Metric
} from '../measurements.ts'
import type { Run } from '../record.ts'
import {
  describeSettings,
  loadSettings,
  optionLabel,
  runMinutes,
  shortRun
} from '../runInfo.ts'
import { rerender, state } from '../state.ts'
import { backendToggles, segmented } from './controls.ts'
import { lineChart } from './lineChart.ts'

/**
 * The runs that share one set of load settings.
 */
interface SettingsGroup {
  key: string
  example: Run
  count: number
}

/**
 * @param options {object}
 * @param options.runs {Run[]}
 * @param options.measurements {Measurement[]}
 * @param options.metric {Metric}
 * @returns {HTMLDivElement}   a row per measurement and shown backend, a
 *   column per run
 */
function trendTable({
  runs,
  measurements,
  metric
}: {
  runs: Run[]
  measurements: Measurement[]
  metric: Metric
}): HTMLDivElement {
  const shown = backends.filter(backend => state.shown.has(backend))
  return el(
    'div',
    { class: 'table-frame' },
    el(
      'table',
      {},
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', {}, 'Test'),
          el('th', {}, 'Backend'),
          runs.map(run =>
            el(
              'th',
              { class: 'number', title: optionLabel(run) },
              shortRun(run)
            )
          )
        )
      ),
      el(
        'tbody',
        {},
        measurements.flatMap(measurement =>
          shown
            .filter(backend =>
              runs.some(run => resultOf({ run, key: measurement.key, backend }))
            )
            .map(backend =>
              el(
                'tr',
                {},
                el('td', {}, measurement.label),
                el('td', {}, backendNames[backend]),
                runs.map(run =>
                  el(
                    'td',
                    { class: 'number' },
                    formatNumber(
                      valueOf({ run, key: measurement.key, backend, metric })
                    )
                  )
                )
              )
            )
        )
      )
    )
  )
}

/**
 * The series' runs grouped by load settings, newest run's group first, and
 * the chosen group kept in the state: the one with the most runs, the
 * newest on a tie, unless one is chosen already.
 *
 * @param runs {Run[]}
 * @returns {Map<string, SettingsGroup>}
 */
function settingsGroups(runs: Run[]): Map<string, SettingsGroup> {
  const groups = new Map<string, SettingsGroup>()
  for (const run of [...runs].reverse()) {
    const key = loadSettings(run)
    const group = groups.get(key) ?? { key, example: run, count: 0 }
    group.count++
    groups.set(key, group)
  }
  if (state.settings !== 'mixed' && !groups.has(state.settings ?? '')) {
    let largest: SettingsGroup | undefined
    for (const group of groups.values()) {
      if (largest === undefined || group.count > largest.count) {
        largest = group
      }
    }
    state.settings = largest?.key ?? null
  }
  return groups
}

/**
 * The notes above the charts: how many runs, how long they took, and what is
 * hidden or not comparable.
 *
 * @param options {object}
 * @param options.used {Run[]}   the runs shown
 * @param options.hidden {number}   the runs left out for other settings
 * @returns {string}
 */
function trendNotes({ used, hidden }: { used: Run[]; hidden: number }): string {
  const notes = [
    `${plural(used.length, 'run')}, ordered by the server build they measured, oldest first.`
  ]
  const minutes = used.map(runMinutes).filter(value => value !== null)
  if (minutes.length > 0) {
    const shortest = Math.min(...minutes)
    const longest = Math.max(...minutes)
    const range =
      shortest === longest ? `${shortest}` : `${shortest} to ${longest}`
    const missing = used.length - minutes.length
    const unrecorded = missing > 0 ? ` (${missing} not recorded)` : ''
    notes.push(`Each run took ${range} min${unrecorded}.`)
  }
  if (hidden > 0) {
    notes.push(`${plural(hidden, 'run')} with other load settings hidden.`)
  }
  if (state.settings === 'mixed') {
    notes.push(
      'Runs with different load settings are not comparable, so a jump can be the settings.'
    )
  }
  if (used.length === 1) {
    notes.push(
      'One run so far, so each chart is a single point until the next run is recorded.'
    )
  }
  return notes.join(' ')
}

/**
 * @param groups {Map<string, SettingsGroup>}
 * @returns {HTMLLabelElement}   the load settings picker
 */
function settingsPicker(groups: Map<string, SettingsGroup>): HTMLLabelElement {
  const select = el(
    'select',
    {},
    [...groups.values()].map(group =>
      el(
        'option',
        { value: group.key, selected: group.key === state.settings },
        `${describeSettings(group.example)} (${plural(group.count, 'run')})`
      )
    ),
    groups.size > 1 &&
      el(
        'option',
        { value: 'mixed', selected: state.settings === 'mixed' },
        'All runs, mixed settings'
      )
  )
  select.addEventListener('change', () => {
    state.settings = select.value
    rerender()
  })
  return el(
    'label',
    { class: 'field' },
    el('span', {}, 'Load settings'),
    select
  )
}

/**
 * @param runs {Run[]}   the series, in build order
 * @returns {HTMLElement[]}
 */
export function trendView(runs: Run[]): HTMLElement[] {
  const groups = settingsGroups(runs)
  const used =
    state.settings === 'mixed'
      ? runs
      : runs.filter(run => loadSettings(run) === state.settings)
  const metric = state.metric
  const measurements = measurementsOf(used).filter(
    measurement => measurement.suite === state.suite
  )
  const controls = el(
    'div',
    { class: 'controls' },
    settingsPicker(groups),
    segmented({
      label: 'Measure',
      options: [
        ['rate', 'Rate'],
        ['avg_ms', 'Latency']
      ],
      value: metric,
      onChange: value => {
        state.metric = value
        rerender()
      }
    }),
    segmented({
      label: 'Tests',
      options: [
        ['sizes', 'Collection sizes'],
        ['matrix', 'Payload matrix']
      ],
      value: state.suite,
      onChange: value => {
        state.suite = value
        rerender()
      }
    }),
    segmented({
      label: 'Show',
      options: [
        ['charts', 'Charts'],
        ['table', 'Table']
      ],
      value: state.asTable ? 'table' : 'charts',
      onChange: value => {
        state.asTable = value === 'table'
        rerender()
      }
    }),
    backendToggles()
  )
  const body = state.asTable
    ? trendTable({ runs: used, measurements, metric })
    : el(
        'div',
        { class: 'grid' },
        measurements.map(measurement =>
          lineChart({ runs: used, measurement, metric })
        )
      )
  return [
    controls,
    el(
      'p',
      { class: 'note' },
      trendNotes({ used, hidden: runs.length - used.length })
    ),
    body
  ]
}
