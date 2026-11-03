/**
 * What the page shows: the series, the tab, and each tab's choices. A view
 * changes the state, then calls `rerender()`, which `main.ts` points at the
 * page's render.
 */
import {
  backends,
  type Backend,
  type Metric,
  type Suite
} from './measurements.ts'

export const views = ['trend', 'compare', 'runs'] as const
export type View = (typeof views)[number]

export interface State {
  // The shown series, by name (`runner / host`).
  series: string | null
  view: View
  metric: Metric
  suite: Suite
  shown: Set<Backend>
  // The load settings the Over time tab shows, or `mixed` for every run.
  settings: string | null
  asTable: boolean
  // The two runs the Side by side tab compares, by id.
  runA: string | null
  runB: string | null
  threshold: number
  onlyChanged: boolean
}

export const state: State = {
  series: null,
  view: 'trend',
  metric: 'rate',
  suite: 'sizes',
  shown: new Set(backends),
  settings: null,
  asTable: false,
  runA: null,
  runB: null,
  threshold: 10,
  onlyChanged: false
}

/**
 * @param value {string | undefined}
 * @returns {boolean}   whether the value names a tab
 */
export function isView(value: string | undefined): value is View {
  return views.some(view => view === value)
}

let renderPage: () => void = () => {}

/**
 * Sets the function `rerender()` calls.
 *
 * @param render {() => void}
 */
export function setRender(render: () => void): void {
  renderPage = render
}

/**
 * Draws the page again from the state.
 */
export function rerender(): void {
  renderPage()
}
