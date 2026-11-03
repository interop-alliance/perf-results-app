/**
 * The page's entry: reads the run records from the Collection the `runs`
 * query parameter names (production's by default), then wires the series
 * picker and the tabs and draws the chosen tab.
 */
import { collectionUrlOf, defaultServerUrl } from './collection.ts'
import { byId, el } from './dom.ts'
import { formatDate, plural } from './format.ts'
import { readRuns, webUrl } from './readRuns.ts'
import type { Run } from './record.ts'
import { groupSeries } from './runInfo.ts'
import { isView, setRender, state, type View } from './state.ts'
import { compareView } from './views/compareView.ts'
import { runsView } from './views/runsView.ts'
import { trendView } from './views/trendView.ts'

const runsUrl =
  new URLSearchParams(location.search).get('runs') ??
  collectionUrlOf({ serverUrl: defaultServerUrl })

const meta = byId('meta', HTMLParagraphElement)
const seriesSelect = byId('series', HTMLSelectElement)
const view = byId('view', HTMLElement)
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role=tab]')]

const builders: Record<View, (runs: Run[]) => HTMLElement[]> = {
  trend: trendView,
  compare: compareView,
  runs: runsView
}

let series: Map<string, Run[]> | null = null

/**
 * Draws the tabs and the chosen tab's view of the chosen series. Nothing is
 * drawn under the tabs until the runs are read.
 */
function render(): void {
  for (const tab of tabs) {
    tab.setAttribute('aria-selected', String(tab.dataset.view === state.view))
  }
  if (series === null) {
    return
  }
  const runs = series.get(state.series ?? '') ?? []
  if (runs.length === 0) {
    view.replaceChildren(
      el(
        'p',
        { class: 'note' },
        'No run records yet. Upload some with pnpm upload in the perf-results-app repo.'
      )
    )
    return
  }
  view.replaceChildren(...builders[state.view](runs))
}

/**
 * Reads the runs, then fills the series picker and draws the page. A failed
 * read leaves the reason on the page.
 */
async function load(): Promise<void> {
  const source = webUrl(runsUrl)
  if (source === null) {
    meta.replaceChildren(`The runs URL ${runsUrl} is not an http or https URL.`)
    return
  }
  meta.replaceChildren(`Reading the runs from ${source}...`)
  let runs: Run[]
  try {
    const read = await readRuns({ collectionUrl: source })
    for (const url of read.skipped) {
      console.warn(`Skipping ${url}: not a schema 1 run record.`)
    }
    runs = read.runs
  } catch (err) {
    meta.replaceChildren(`Could not read the runs from ${source}.`)
    view.replaceChildren(
      el(
        'p',
        { class: 'note' },
        err instanceof Error ? err.message : String(err)
      )
    )
    return
  }
  const grouped = groupSeries(runs)
  series = grouped.series
  state.series = grouped.newest
  meta.replaceChildren(
    `${plural(runs.length, 'run')} in ${series.size} series, read from `,
    el('a', { href: source }, source),
    ` at ${formatDate(new Date().toISOString())}.`
  )
  seriesSelect.replaceChildren(
    ...[...series].map(([name, members]) =>
      el(
        'option',
        { value: name, selected: name === state.series },
        `${name} (${plural(members.length, 'run')})`
      )
    )
  )
  render()
}

setRender(render)
const hashView = location.hash.slice(1)
if (isView(hashView)) {
  state.view = hashView
}
seriesSelect.addEventListener('change', () => {
  state.series = seriesSelect.value
  state.settings = null
  state.runA = null
  state.runB = null
  render()
})
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    const chosen = tab.dataset.view
    if (isView(chosen)) {
      state.view = chosen
      history.replaceState(null, '', `#${chosen}`)
      render()
    }
  })
}
window.addEventListener('hashchange', () => {
  const chosen = location.hash.slice(1)
  if (isView(chosen) && chosen !== state.view) {
    state.view = chosen
    render()
  }
})
render()
void load()
