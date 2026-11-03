/**
 * The controls the tabs share: a segmented choice, a checkbox, and the backend
 * toggles that double as the charts' legend.
 */
import { el } from '../dom.ts'
import { backendNames, backends } from '../measurements.ts'
import { rerender, state } from '../state.ts'

/**
 * A row of buttons, one pressed, choosing one of a few values.
 *
 * @param options {object}
 * @param options.label {string}
 * @param options.options {[Value, string][]}   each value with its button text
 * @param options.value {Value}   the chosen value
 * @param options.onChange {(value: Value) => void}
 * @returns {HTMLDivElement}
 */
export function segmented<Value extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: [Value, string][]
  value: Value
  onChange: (value: Value) => void
}): HTMLDivElement {
  return el(
    'div',
    { class: 'field' },
    el('span', {}, label),
    el(
      'div',
      { class: 'segmented', role: 'group', 'aria-label': label },
      options.map(([optionValue, text]) =>
        el(
          'button',
          {
            type: 'button',
            'aria-pressed': String(optionValue === value),
            onclick: () => onChange(optionValue)
          },
          text
        )
      )
    )
  )
}

/**
 * @param options {object}
 * @param options.label {string}
 * @param options.checked {boolean}
 * @param options.onChange {(checked: boolean) => void}
 * @returns {HTMLLabelElement}
 */
export function checkbox({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): HTMLLabelElement {
  const input = el('input', { type: 'checkbox', checked })
  input.addEventListener('change', () => onChange(input.checked))
  return el('label', { class: 'check' }, input, label)
}

/**
 * One checkbox per backend, with its line color, choosing the lines shown.
 *
 * @returns {HTMLDivElement}
 */
export function backendToggles(): HTMLDivElement {
  return el(
    'div',
    { class: 'field' },
    el('span', {}, 'Backends'),
    el(
      'div',
      { class: 'legend' },
      backends.map(backend => {
        const input = el('input', {
          type: 'checkbox',
          checked: state.shown.has(backend)
        })
        input.addEventListener('change', () => {
          if (input.checked) {
            state.shown.add(backend)
          } else {
            state.shown.delete(backend)
          }
          rerender()
        })
        return el(
          'label',
          { class: 'check' },
          input,
          el('span', { class: `key key-${backend}` }),
          backendNames[backend]
        )
      })
    )
  )
}
