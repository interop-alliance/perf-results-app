/**
 * The charts' scale.
 */

/**
 * The top of a chart's scale: the first of 1, 2, 2.5, 5 and 10 times a power
 * of ten at or above the value.
 *
 * @param value {number}
 * @returns {number}
 */
export function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1
  }
  const magnitude = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) {
      return step * magnitude
    }
  }
  return 10 * magnitude
}
