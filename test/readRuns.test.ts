import { describe, expect, it } from 'vitest'
import { readRuns, webUrl } from '../src/readRuns.ts'
import { makeRun } from './fixtures.ts'

const collectionUrl = 'https://pws.example/space/perf-results/runs/'

/**
 * A fetch over fixed responses: the JSON body for each URL, 404 for any
 * other. Records every URL it is asked for.
 *
 * @param bodies {Record<string, unknown>}
 * @returns {{ fetcher: typeof fetch, requested: string[] }}
 */
function fakeFetch(bodies: Record<string, unknown>): {
  fetcher: typeof fetch
  requested: string[]
} {
  const requested: string[] = []
  async function fetcher(input: string | URL | Request): Promise<Response> {
    const url = input instanceof Request ? input.url : String(input)
    requested.push(url)
    await Promise.resolve()
    if (!(url in bodies)) {
      return new Response('{}', { status: 404 })
    }
    return Response.json(bodies[url])
  }
  return { fetcher, requested }
}

describe('webUrl', () => {
  it('resolves a relative URL against its base', () => {
    expect(webUrl('/space/s/c/r', 'https://pws.example/space/s/c/')).toBe(
      'https://pws.example/space/s/c/r'
    )
  })

  it('keeps only http and https URLs', () => {
    expect(webUrl('javascript:alert(1)')).toBeNull()
    expect(webUrl('not a url')).toBeNull()
    expect(webUrl('http://localhost:4455/x')).toBe('http://localhost:4455/x')
  })
})

describe('readRuns', () => {
  it('follows the listing pages and reads every record', async () => {
    const first = makeRun({ runner: 'first' })
    const second = makeRun({ runner: 'second' })
    const { fetcher } = fakeFetch({
      [collectionUrl]: {
        items: [{ id: 'one', url: '/space/perf-results/runs/one' }],
        next: '/space/perf-results/runs/?cursor=one'
      },
      [`${collectionUrl}?cursor=one`]: {
        items: [{ id: 'two', url: '/space/perf-results/runs/two' }]
      },
      [`${collectionUrl}one`]: first,
      [`${collectionUrl}two`]: second
    })

    const { runs, skipped } = await readRuns({ collectionUrl, fetcher })

    expect(skipped).toEqual([])
    expect(runs.map(run => [run.id, run.runner, run.url]).sort()).toEqual([
      ['one', 'first', `${collectionUrl}one`],
      ['two', 'second', `${collectionUrl}two`]
    ])
  })

  it('skips a Resource that is not a run record', async () => {
    const { fetcher } = fakeFetch({
      [collectionUrl]: {
        items: [
          { id: 'run', url: `${collectionUrl}run` },
          { id: 'note', url: `${collectionUrl}note` }
        ]
      },
      [`${collectionUrl}run`]: makeRun(),
      [`${collectionUrl}note`]: { hello: 'world' }
    })

    const { runs, skipped } = await readRuns({ collectionUrl, fetcher })

    expect(runs.map(run => run.id)).toEqual(['run'])
    expect(skipped).toEqual([`${collectionUrl}note`])
  })

  it('never fetches an item URL that is not http or https', async () => {
    const { fetcher, requested } = fakeFetch({
      [collectionUrl]: {
        items: [{ id: 'bad', url: 'javascript:alert(1)' }]
      }
    })

    const { runs } = await readRuns({ collectionUrl, fetcher })

    expect(runs).toEqual([])
    expect(requested).toEqual([collectionUrl])
  })

  it('stops when a next link leads back to a page it read', async () => {
    const { fetcher, requested } = fakeFetch({
      [collectionUrl]: { items: [], next: collectionUrl }
    })

    await readRuns({ collectionUrl, fetcher })

    expect(requested).toEqual([collectionUrl])
  })

  it('says a missing Collection is missing, or not public', async () => {
    const { fetcher } = fakeFetch({})

    await expect(readRuns({ collectionUrl, fetcher })).rejects.toThrow(
      `${collectionUrl} is missing, or not public.`
    )
  })
})
