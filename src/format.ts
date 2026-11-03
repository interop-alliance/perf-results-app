/**
 * How numbers, changes and dates read on the page.
 */

/**
 * A count with its noun, plural unless the count is 1: `2 runs`, `1 run`.
 *
 * @param count {number}
 * @param word {string}   the singular noun
 * @returns {string}
 */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

/**
 * How many fraction digits a value of this size shows: none from 100, one
 * from 1, two below.
 *
 * @param size {number}   the absolute value
 * @returns {number}
 */
function fractionDigits(size: number): number {
  if (size >= 100) {
    return 0
  }
  if (size >= 1) {
    return 1
  }
  return 2
}

/**
 * A measured value, rounded to its size, or `--` when there is none.
 *
 * @param value {number | null | undefined}
 * @returns {string}
 */
export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '--'
  }
  return value.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits(Math.abs(value))
  })
}

/**
 * A signed percent change, `+12%` or `-4.5%`, or `--` when there is none.
 *
 * @param percent {number | null}
 * @returns {string}
 */
export function formatChange(percent: number | null): string {
  if (percent === null) {
    return '--'
  }
  const digits = Math.abs(percent) >= 10 ? 0 : 1
  return `${percent > 0 ? '+' : ''}${percent.toFixed(digits)}%`
}

/**
 * An ISO timestamp to the minute, `2026-11-03 15:47 UTC`, or `--`.
 *
 * @param iso {string | null | undefined}
 * @returns {string}
 */
export function formatDate(iso: string | null | undefined): string {
  return iso ? `${iso.slice(0, 16).replace('T', ' ')} UTC` : '--'
}
