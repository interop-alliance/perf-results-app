/**
 * The Runs tab: every run in the series, newest build first, with a link to
 * each record.
 */
import { el } from '../dom.ts'
import { formatDate, plural } from '../format.ts'
import type { Run } from '../record.ts'
import { describeSettings, formatMinutes } from '../runInfo.ts'

/**
 * @param run {Run}
 * @returns {HTMLAnchorElement}   a link to the record's JSON, named by its id
 */
export function recordLink(run: Run): HTMLAnchorElement {
  return el('a', { href: run.url }, run.id)
}

/**
 * @param runs {Run[]}   the series, in build order
 * @returns {HTMLElement[]}
 */
export function runsView(runs: Run[]): HTMLElement[] {
  const columns = [
    'Run',
    'Took',
    'Server',
    'Built',
    'Label',
    'Load',
    'Payloads',
    'Tests from',
    'Record'
  ]
  return [
    el(
      'p',
      { class: 'note' },
      `${plural(runs.length, 'run')} in this series, newest build first.`
    ),
    el(
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
            columns.map(name => el('th', {}, name))
          )
        ),
        el(
          'tbody',
          {},
          [...runs]
            .reverse()
            .map(run =>
              el(
                'tr',
                {},
                el('td', {}, formatDate(run.datetime)),
                el('td', {}, formatMinutes(run)),
                el('td', {}, run.server_version ?? 'from source'),
                el('td', {}, formatDate(run.server_built_at)),
                el('td', {}, run.label ?? ''),
                el('td', {}, describeSettings(run)),
                el('td', {}, (run.settings.payloads ?? []).join(', ')),
                el('td', {}, run.tool?.commit ?? ''),
                el('td', {}, recordLink(run))
              )
            )
        )
      )
    )
  ]
}
