# Contributing

Code style for this repo. ESLint (`eslint.config.js`) and Prettier
(`prettier.config.js`) enforce what they can; `pnpm check` runs both. For the
repo's layout and its other rules, see [AGENTS.md](./AGENTS.md).

## Text

- ASCII only, in code, comments and docs: write `->` and `--`, not arrows or
  dashes, and `...`, not an ellipsis character. ESLint refuses a string that
  breaks this.

## Naming

- `camelCase` for variables, functions and properties; `PascalCase` for types
  and classes.
- Descriptive names, never one letter (`err`, not `e`; `run`, not `r`). The one
  exception is `x` and `y`, a chart's coordinates. ESLint checks this.
- Record members keep the record's own names (`avg_ms`, `spaces_url`).

## Functions

- Named `function` declarations at module level, not arrow functions.
- Pass related arguments as one options object, destructured in the signature:
  `recordId({ record })`, `valueOf({ run, key, backend, metric })`. A function
  of one value, or of two that read as a pair, may take them plainly.
- Export inline: `export function ...`, `export interface ...`.
- A pure function that a test can reach goes in a module with no DOM, outside
  `src/views/`.

## Types

- An options type used once is written inline at the signature, not as a named
  interface.
- Import types with `import type` (ESLint fixes this).

## Control flow

- Braces on every `if`, `for` and `while`, even a one-line body.
- No nested ternaries: an `if` chain or a lookup table instead.
- `===` and `!==` only.

## Errors

- Name a caught error `err`.
- Wrap and rethrow with the cause: `new Error(message, { cause: err })`.
- A message says what went wrong in terms the reader can act on, naming the file
  or URL involved.

## Comments

- A `/** */` block at the top of every module, saying what it is for.
- A `/** */` block on every exported function and type, in the multi-line form
  even for one sentence, with `@param options {object}` and one
  `@param options.<name> {type}` line per option, `[options.name]` for an
  optional one, and `@returns {type}`.
- `//` only for a short note inside a function.
- Say why, not what the next line does.
