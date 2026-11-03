# perf-results-app

A page over the `pnpm perf:remote` run records of the
[PWS reference server](https://github.com/interop-alliance/was-teaching-server):
each series of runs over time, two runs side by side, and the list of runs. The
records live in a public Collection on a PWS server, production's by default:

```
https://freewallet.me/space/perf-results/runs/
```

The page only reads. It lists that Collection and fetches each record, with no
key, so any static host serves it; this repo publishes it to GitHub Pages. Three
scripts write the records, signed with the key that controls the Space.

The master copy of every record stays a JSON file in git, where
`pnpm perf:remote --record` writes it (`ops/perf-results/` in the ops repo). The
Space is a published copy: when the server's data is wiped, the scripts put it
back.

It is TypeScript throughout: the page is built with Vite, and Node 24 runs the
scripts' `.ts` files as they are. [AGENTS.md](./AGENTS.md) maps the code and
lists the rules; [CONTRIBUTING.md](./CONTRIBUTING.md) has the code style.

## Developing

With Node 24 and pnpm:

```bash
pnpm install
pnpm dev       # the page on a local server, reading production's records
pnpm check     # type-check, lint, format check, tests and build
```

`?runs=<Collection URL>` makes the page read another Collection, such as a local
server's:

```
http://localhost:5173/?runs=http://localhost:4455/space/perf-results/runs/
```

`pnpm build` writes the page to `dist/`, and `pnpm preview` serves that build.
The built page loads as a module, so open it through a server, not from disk.

## Setting up the Space

Once:

```bash
pnpm new-key     # writes PERF_RESULTS_SECRET to .env and prints its did:key
pnpm provision   # creates the Space, the runs Collection and its public-read policy
```

`.env` holds the key that controls the Space. It is gitignored: keep a copy
somewhere safe, since another key cannot write to the Space. `pnpm new-key`
keeps a key `.env` already holds. `pnpm provision` creates only what is missing,
so it is safe to run again.

## Uploading runs

After a run recorded with `pnpm perf:remote --record`, upload its file, or a
whole folder of them:

```bash
pnpm upload ../ops/perf-results/laptop-omar/freewallet.me/2026-11-03T154756Z.json
pnpm upload ../ops/perf-results
```

Each record is stored as is, under the id `<runner>~<host>~<stamp>`, such as
`laptop-omar~freewallet.me~2026-11-03T154756Z`. Uploading a record again
replaces it with the same content. A JSON file that is not a schema 1 run record
is skipped with a warning.

## After a server wipe

A wipe of the server's data removes the Space and its records, and the page then
says the Collection is missing. Put both back from the files:

```bash
pnpm provision && pnpm upload ../ops/perf-results
```

## Another server

`PERF_RESULTS_SERVER` points the scripts at another server, such as a local one,
in the environment or in `.env`:

```bash
PERF_RESULTS_SERVER=http://localhost:4455 pnpm provision
```

## Publishing

`.github/workflows/pages.yml` runs `pnpm check` and publishes `dist/` to GitHub
Pages on every push to `main`. In the repo settings, under Pages, set the source
to GitHub Actions. `.github/workflows/ci.yml` runs the same check on every push
and pull request.
