/**
 * One measurement over a series, as an SVG line chart: a line per shown
 * backend, a dashed mark where the server version changes, and a crosshair
 * tooltip that the pointer and the arrow keys move.
 */
import { el, svgEl } from '../dom.ts'
import { formatDate, formatNumber, plural } from '../format.ts'
import {
  backendNames,
  backends,
  valueOf,
  type Backend,
  type Measurement,
  type Metric
} from '../measurements.ts'
import type { Run } from '../record.ts'
import { formatMinutes, shortRun } from '../runInfo.ts'
import { niceCeiling } from '../scale.ts'
import { state } from '../state.ts'

const width = 320
const height = 168
const margin = { top: 18, right: 14, bottom: 24, left: 44 }
const plotWidth = width - margin.left - margin.right
const plotHeight = height - margin.top - margin.bottom

/**
 * One backend's values across the runs, null where a run has none.
 */
interface Line {
  backend: Backend
  values: (number | null)[]
}

/**
 * The SVG path of a line, broken where a run has no value.
 *
 * @param options {object}
 * @param options.values {(number | null)[]}
 * @param options.xOf {(index: number) => number}
 * @param options.yOf {(value: number) => number}
 * @returns {string}
 */
function linePath({
  values,
  xOf,
  yOf
}: {
  values: (number | null)[]
  xOf: (index: number) => number
  yOf: (value: number) => number
}): string {
  let path = ''
  let drawing = false
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false
      return
    }
    path += `${drawing ? 'L' : 'M'}${xOf(index).toFixed(1)},${yOf(value).toFixed(1)}`
    drawing = true
  })
  return path
}

/**
 * The tooltip's text for one run: its server, build, run time, and each
 * line's value.
 *
 * @param options {object}
 * @param options.run {Run}
 * @param options.lines {Line[]}
 * @param options.index {number}   the run's place in the series
 * @returns {HTMLElement[]}
 */
function tooltipRows({
  run,
  lines,
  index
}: {
  run: Run
  lines: Line[]
  index: number
}): HTMLElement[] {
  const label = run.label ? `, ${run.label}` : ''
  return [
    el(
      'div',
      {},
      el('strong', {}, `Server ${run.server_version ?? 'from source'}`)
    ),
    el('div', { class: 'muted' }, `built ${formatDate(run.server_built_at)}`),
    el(
      'div',
      { class: 'muted' },
      `run ${formatDate(run.datetime)}, took ${formatMinutes(run)}${label}`
    ),
    ...lines.map(line =>
      el(
        'div',
        { class: 'tooltip-row' },
        el('span', { class: `key key-${line.backend}` }),
        el('strong', {}, formatNumber(line.values[index])),
        el('span', { class: 'muted' }, backendNames[line.backend])
      )
    )
  ]
}

/**
 * @param options {object}
 * @param options.runs {Run[]}   the series, in build order
 * @param options.measurement {Measurement}
 * @param options.metric {Metric}
 * @returns {HTMLElement}   the chart's card
 */
export function lineChart({
  runs,
  measurement,
  metric
}: {
  runs: Run[]
  measurement: Measurement
  metric: Metric
}): HTMLElement {
  const lines: Line[] = backends
    .filter(backend => state.shown.has(backend))
    .map(backend => ({
      backend,
      values: runs.map(run =>
        valueOf({ run, key: measurement.key, backend, metric })
      )
    }))
  const card = el(
    'figure',
    { class: 'card' },
    el(
      'figcaption',
      {},
      el('strong', {}, measurement.label),
      el(
        'span',
        { class: 'muted' },
        metric === 'rate' ? measurement.unit : 'ms, average'
      )
    )
  )
  const present = lines
    .flatMap(line => line.values)
    .filter(value => value !== null)
  if (present.length === 0) {
    card.append(
      el(
        'p',
        { class: 'note' },
        'No numbers: skipped, or no request completed.'
      )
    )
    return card
  }

  const yMax = niceCeiling(Math.max(...present) * 1.05)
  const xOf = (index: number): number =>
    runs.length === 1
      ? margin.left + plotWidth / 2
      : margin.left + (index * plotWidth) / (runs.length - 1)
  const yOf = (value: number): number =>
    margin.top + plotHeight * (1 - value / yMax)
  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'plot',
    tabindex: '0',
    role: 'img',
    'aria-label': `${measurement.label}: ${metric === 'rate' ? 'rate' : 'latency'} over ${plural(runs.length, 'run')}`
  })

  for (const tick of [0, yMax / 2, yMax]) {
    const y = yOf(tick)
    svg.append(
      svgEl('line', {
        x1: margin.left,
        x2: width - margin.right,
        y1: y,
        y2: y,
        class: tick === 0 ? 'axis-line' : 'grid-line'
      }),
      svgEl(
        'text',
        { x: margin.left - 6, y: y + 3.5, 'text-anchor': 'end', class: 'tick' },
        formatNumber(tick)
      )
    )
  }
  for (let index = 1; index < runs.length; index++) {
    const run = runs[index]
    const previous = runs[index - 1]
    if (!run || !previous || run.server_version === previous.server_version) {
      continue
    }
    const x = (xOf(index - 1) + xOf(index)) / 2
    svg.append(
      svgEl('line', {
        x1: x,
        x2: x,
        y1: margin.top - 8,
        y2: margin.top + plotHeight,
        class: 'boundary'
      }),
      svgEl(
        'text',
        { x: x + 3, y: margin.top - 9, class: 'tick' },
        run.server_version ?? 'source'
      )
    )
  }
  const runLabels: [number, string][] =
    runs.length === 1
      ? [[0, 'middle']]
      : [
          [0, 'start'],
          [runs.length - 1, 'end']
        ]
  for (const [index, anchor] of runLabels) {
    const run = runs[index]
    if (run) {
      svg.append(
        svgEl(
          'text',
          {
            x: xOf(index),
            y: height - 6,
            'text-anchor': anchor,
            class: 'tick'
          },
          shortRun(run)
        )
      )
    }
  }
  for (const line of lines) {
    svg.append(
      svgEl('path', {
        d: linePath({ values: line.values, xOf, yOf }),
        class: `line line-${line.backend}`
      })
    )
    line.values.forEach((value, index) => {
      if (value === null) {
        return
      }
      svg.append(
        svgEl('circle', {
          cx: xOf(index).toFixed(1),
          cy: yOf(value).toFixed(1),
          r: 4,
          class: `dot dot-${line.backend}`
        })
      )
    })
  }

  const crosshair = svgEl('line', {
    y1: margin.top,
    y2: margin.top + plotHeight,
    class: 'crosshair',
    visibility: 'hidden'
  })
  svg.append(crosshair)
  const tooltip = el('div', { class: 'tooltip', hidden: true })
  const frame = el('div', { class: 'plot-frame' }, svg, tooltip)
  card.append(frame)

  let focused = runs.length - 1
  function show(index: number): void {
    const run = runs[index]
    if (!run) {
      return
    }
    focused = index
    const x = xOf(index)
    crosshair.setAttribute('x1', String(x))
    crosshair.setAttribute('x2', String(x))
    crosshair.setAttribute('visibility', 'visible')
    tooltip.replaceChildren(...tooltipRows({ run, lines, index }))
    tooltip.hidden = false
    // Beside the crosshair when it fits, else below the chart, so it never
    // covers the run it describes.
    const scale = svg.getBoundingClientRect().width / width
    const tooltipWidth = tooltip.offsetWidth
    const crosshairX = x * scale
    let left = crosshairX + 12
    let top = margin.top * scale
    if (left + tooltipWidth > frame.clientWidth) {
      left = crosshairX - 12 - tooltipWidth
    }
    if (left < 0) {
      left = Math.min(
        Math.max(crosshairX - tooltipWidth / 2, 0),
        frame.clientWidth - tooltipWidth
      )
      top = height * scale + 4
    }
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }
  function hide(): void {
    crosshair.setAttribute('visibility', 'hidden')
    tooltip.hidden = true
  }
  function nearest(event: PointerEvent): number {
    if (runs.length === 1) {
      return 0
    }
    const box = svg.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * width
    const index = Math.round(
      ((x - margin.left) / plotWidth) * (runs.length - 1)
    )
    return Math.min(Math.max(index, 0), runs.length - 1)
  }
  svg.addEventListener('pointermove', event => show(nearest(event)))
  svg.addEventListener('pointerdown', event => show(nearest(event)))
  svg.addEventListener('pointerleave', hide)
  svg.addEventListener('focus', () => show(focused))
  svg.addEventListener('blur', hide)
  svg.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      show(Math.max(focused - 1, 0))
    } else if (event.key === 'ArrowRight') {
      show(Math.min(focused + 1, runs.length - 1))
    } else {
      return
    }
    event.preventDefault()
  })
  return card
}
