/**
 * Building the page's elements. Every string becomes a text node, so no record
 * value reaches the page as markup.
 */

/**
 * What an element can hold: nodes and text, with nothing (`null`,
 * `undefined`, `false`) left out and arrays flattened.
 */
export type Child = Node | string | number | false | null | undefined | Child[]

/**
 * An element's attributes and listeners: a function is the listener for the
 * event its name, less the `on`, names (`onclick` is `click`). `true` sets an
 * attribute with no value; `false`, `null` and `undefined` leave it out.
 */
export type Props = Record<
  string,
  string | number | boolean | null | undefined | ((event: Event) => void)
>

/**
 * @param node {Node}
 * @param children {Child[]}
 */
function appendChildren(node: Node, children: Child[]): void {
  for (const child of children) {
    if (Array.isArray(child)) {
      appendChildren(node, child)
    } else if (child instanceof Node) {
      node.appendChild(child)
    } else if (child !== null && child !== undefined && child !== false) {
      node.appendChild(document.createTextNode(String(child)))
    }
  }
}

/**
 * Creates an HTML element.
 *
 * @param tag {string}
 * @param [props] {Props}
 * @param children {Child[]}
 * @returns {HTMLElement}
 */
export function el<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) {
      continue
    }
    if (typeof value === 'function') {
      node.addEventListener(name.replace(/^on/, ''), value)
    } else {
      node.setAttribute(name, value === true ? '' : String(value))
    }
  }
  appendChildren(node, children)
  return node
}

/**
 * Creates an SVG element.
 *
 * @param tag {string}
 * @param [attrs] {Record<string, string | number>}
 * @param [text] {string}
 * @returns {SVGElement}
 */
export function svgEl<Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attrs: Record<string, string | number> = {},
  text?: string
): SVGElementTagNameMap[Tag] {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value))
  }
  if (text !== undefined) {
    node.textContent = text
  }
  return node
}

/**
 * The page element with an id, which must be of the given kind.
 *
 * @param id {string}
 * @param kind {Function}   the element class, such as `HTMLSelectElement`
 * @returns {HTMLElement}
 */
export function byId<Kind extends HTMLElement>(
  id: string,
  kind: new () => Kind
): Kind {
  const node = document.getElementById(id)
  if (!(node instanceof kind)) {
    throw new Error(`index.html has no ${kind.name} with the id ${id}.`)
  }
  return node
}
