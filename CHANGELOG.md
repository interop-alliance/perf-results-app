# History

## 0.1.0 - TBD

### Added

- The perf results page, moved from the ops repo's `pnpm run report`: each
  series of runs over time, two runs side by side, and the list of runs. It
  reads the run records from a public Collection on a PWS server
  (`https://freewallet.me/space/perf-results/runs/` by default, another with
  `?runs=<url>`) instead of embedding them, and shows each record's id with a
  link to it. The markup is `index.html`, the styles `src/styles.css`, and the
  code strict TypeScript modules under `src/`, built with Vite.
- `pnpm new-key`, `pnpm provision` and `pnpm upload`: make the key that controls
  the results Space, create the Space, its `runs` Collection and its public-read
  policy when missing, and upload run record files to it. Node 24 runs them as
  TypeScript.
- `pnpm check`: type-check, ESLint, Prettier check, Vitest tests over the
  modules that touch no DOM, and the build. CI runs it on every push and pull
  request.
- A GitHub Pages workflow that runs `pnpm check` and publishes the build on
  every push to `main`.
- AGENTS.md (the layout and the rules) and CONTRIBUTING.md (the code style).
