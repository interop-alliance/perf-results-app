/**
 * The Side by side tab: two runs of the series, A the baseline and B compared
 * with it, each measurement's change, and a verdict past a threshold.
 */
import {
  compareRows,
  compareText,
  settingsDifferences,
  type CompareRow,
  type Verdict
} from '../compare.ts'
import { el } from '../dom.ts'
import { formatChange, formatDate, formatNumber, plural } from '../format.ts'
import { backendNames } from '../measurements.ts'
import type { Run } from '../record.ts'
import {
  describeSettings,
  formatMinutes,
  loadSettings,
  optionLabel
} from '../runInfo.ts'
import { rerender, state } from '../state.ts'
import { checkbox } from './controls.ts'
import { recordLink } from './runsView.ts'

/**
 * Picks A and B when the state names no run of this series: B the newest
 * run, A the run before it with B's load settings, else the run before it.
 *
 * @param runs {Run[]}   the series, in build order, at least one run
 * @param latest {Run}   the series' last run
 * @returns {{ runA: Run, runB: Run }}
 */
function pickRuns(runs: Run[], latest: Run): { runA: Run; runB: Run } {
  const runB = runs.find(run => run.id === state.runB) ?? latest
  state.runB = runB.id
  let runA = runs.find(run => run.id === state.runA)
  if (runA === undefined) {
    const before = runs.slice(0, runs.indexOf(runB))
    const alike = before.filter(run => loadSettings(run) === loadSettings(runB))
    runA = alike.at(-1) ?? before.at(-1) ?? runB
  }
  state.runA = runA.id
  return { runA, runB }
}

/**
 * @param options {object}
 * @param options.runs {Run[]}
 * @param options.label {string}
 * @param options.which {'runA' | 'runB'}   the run this picker sets
 * @returns {HTMLLabelElement}
 */
function runPicker({
  runs,
  label,
  which
}: {
  runs: Run[]
  label: string
  which: 'runA' | 'runB'
}): HTMLLabelElement {
  const select = el(
    'select',
    {},
    runs.map(run =>
      el(
        'option',
        { value: run.id, selected: run.id === state[which] },
        optionLabel(run)
      )
    )
  )
  select.addEventListener('change', () => {
    state[which] = select.value
    rerender()
  })
  return el('label', { class: 'field' }, el('span', {}, label), select)
}

/**
 * @returns {HTMLLabelElement}   the threshold input
 */
function thresholdField(): HTMLLabelElement {
  const input = el('input', {
    type: 'number',
    min: '0',
    step: '1',
    value: String(state.threshold)
  })
  input.addEventListener('change', () => {
    state.threshold = Math.max(0, Number(input.value) || 0)
    rerender()
  })
  return el('label', { class: 'field' }, el('span', {}, 'Threshold, %'), input)
}

/**
 * @param run {Run}
 * @param title {string}
 * @returns {HTMLDivElement}   the run's facts
 */
function runCard(run: Run, title: string): HTMLDivElement {
  const facts: [string, string | Node | undefined][] = [
    ['Server', run.server_version ?? 'from source'],
    ['Built', formatDate(run.server_built_at)],
    ['Run', formatDate(run.datetime)],
    ['Took', formatMinutes(run)],
    ['Label', run.label],
    ['Load', describeSettings(run)],
    ['Payloads', (run.settings.payloads ?? []).join(', ')],
    ['Tests from', run.tool?.commit],
    ['Record', recordLink(run)]
  ]
  return el(
    'div',
    { class: 'card' },
    el('h2', {}, title),
    el(
      'dl',
      {},
      facts
        .filter(([, value]) => value)
        .map(([name, value]) => [el('dt', {}, name), el('dd', {}, value)])
    )
  )
}

/**
 * @param verdict {Verdict}
 * @returns {HTMLSpanElement | string}   the verdict as a chip, or nothing
 */
function verdictChip(verdict: Verdict): HTMLSpanElement | string {
  if (verdict === '') {
    return ''
  }
  const kind = ['better', 'worse', 'mixed'].includes(verdict)
    ? verdict
    : 'other'
  return el('span', { class: `verdict verdict-${kind}` }, verdict)
}

/**
 * A button that copies the comparison as text, falling back to a selected
 * text area where the clipboard is refused.
 *
 * @param options {object}
 * @param options.text {string}
 * @returns {HTMLElement[]}   the button and the place the text area goes
 */
function copyControls({ text }: { text: string }): [HTMLElement, HTMLElement] {
  const copyArea = el('div', {})
  const button = el('button', { type: 'button' }, 'Copy the table as text')
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      button.textContent = 'Copied'
    } catch {
      const area = el('textarea', { readonly: true }, text)
      copyArea.replaceChildren(area)
      area.select()
    }
  }
  button.addEventListener('click', () => {
    void copy()
  })
  return [button, copyArea]
}

/**
 * @param rows {CompareRow[]}
 * @returns {HTMLDivElement}   the comparison table
 */
function compareTable(rows: CompareRow[]): HTMLDivElement {
  const numberCell = (text: string, trend = ''): HTMLTableCellElement =>
    el('td', { class: `number ${trend}`.trim() }, text)
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
          [
            'Rate A',
            'Rate B',
            'Change',
            'Avg ms A',
            'Avg ms B',
            'Change',
            'Failed A',
            'Failed B'
          ].map(name => el('th', { class: 'number' }, name)),
          el('th', {}, 'Verdict')
        )
      ),
      el(
        'tbody',
        {},
        rows.map(row =>
          el(
            'tr',
            {},
            el('td', {}, row.measurement.label),
            el('td', {}, backendNames[row.backend]),
            numberCell(formatNumber(row.resultA?.rate)),
            numberCell(formatNumber(row.resultB?.rate)),
            numberCell(formatChange(row.rateChange), row.rateTrend),
            numberCell(formatNumber(row.resultA?.avg_ms)),
            numberCell(formatNumber(row.resultB?.avg_ms)),
            numberCell(formatChange(row.latencyChange), row.latencyTrend),
            numberCell(String(row.resultA?.failed ?? '--')),
            numberCell(String(row.resultB?.failed ?? '--')),
            el('td', {}, verdictChip(row.verdict))
          )
        )
      )
    )
  )
}

/**
 * @param runs {Run[]}   the series, in build order
 * @returns {HTMLElement[]}
 */
export function compareView(runs: Run[]): HTMLElement[] {
  const latest = runs.at(-1)
  if (latest === undefined) {
    return []
  }
  const { runA, runB } = pickRuns(runs, latest)
  const threshold = state.threshold
  const parts: HTMLElement[] = [
    el(
      'div',
      { class: 'controls' },
      runPicker({ runs, label: 'Baseline (A)', which: 'runA' }),
      runPicker({ runs, label: 'Compared (B)', which: 'runB' }),
      thresholdField(),
      checkbox({
        label: 'Only rows past the threshold',
        checked: state.onlyChanged,
        onChange: checked => {
          state.onlyChanged = checked
          rerender()
        }
      })
    )
  ]
  if (runs.length === 1) {
    parts.push(
      el(
        'p',
        { class: 'note' },
        'This series has one run, so A and B are the same run. Record another to compare.'
      )
    )
  }
  parts.push(
    el(
      'div',
      { class: 'runs' },
      runCard(runA, 'A, the baseline'),
      runCard(runB, 'B, compared with A')
    )
  )
  const differences = settingsDifferences({ runA, runB })
  if (differences.length > 0) {
    parts.push(
      el(
        'div',
        { class: 'warning' },
        'The two runs used different settings, so some changes come from the settings, not the server:',
        el(
          'ul',
          {},
          differences.map(text => el('li', {}, text))
        )
      )
    )
  }

  const rows = compareRows({ runA, runB, threshold })
  const count = (verdict: Verdict): number =>
    rows.filter(row => row.verdict === verdict).length
  const shownRows = state.onlyChanged
    ? rows.filter(row => row.verdict !== '')
    : rows
  const [copyButton, copyArea] = copyControls({
    text: compareText({ runA, runB, rows: shownRows, threshold })
  })
  parts.push(
    el(
      'div',
      { class: 'summary' },
      el(
        'span',
        {},
        `Past ${threshold}%: ${count('better')} better, ${count('worse')} worse, ${count('mixed')} mixed, of ${plural(rows.length, 'measurement')}.`
      ),
      copyButton
    ),
    copyArea,
    compareTable(shownRows)
  )
  if (shownRows.length === 0) {
    parts.push(
      el('p', { class: 'note' }, `No measurement moved past ${threshold}%.`)
    )
  }
  return parts
}
