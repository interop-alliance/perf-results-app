import { describe, expect, it } from 'vitest'
import { collectionUrlOf } from '../src/collection.ts'
import {
  hostOf,
  isRunRecord,
  isValidId,
  recordId,
  stampOf
} from '../src/record.ts'
import { makeRun } from './fixtures.ts'

describe('hostOf', () => {
  it('names the host, with a port as -<port>', () => {
    expect(hostOf({ spacesUrl: 'https://freewallet.me/spaces/' })).toBe(
      'freewallet.me'
    )
    expect(hostOf({ spacesUrl: 'http://localhost:4455/spaces/' })).toBe(
      'localhost-4455'
    )
  })
})

describe('stampOf', () => {
  it('names a start the way the record files do', () => {
    expect(stampOf({ datetime: '2026-11-03T15:47:56.491Z' })).toBe(
      '2026-11-03T154756Z'
    )
  })
})

describe('recordId', () => {
  it('joins the runner, host and stamp into an id the server accepts', () => {
    const id = recordId({ record: makeRun() })
    expect(id).toBe('laptop-omar~freewallet.me~2026-11-03T154756Z')
    expect(isValidId({ id })).toBe(true)
  })

  it('refuses an id with a character the server does not allow', () => {
    expect(isValidId({ id: 'laptop omar~freewallet.me' })).toBe(false)
  })
})

describe('isRunRecord', () => {
  it('accepts a schema 1 record', () => {
    expect(isRunRecord(makeRun())).toBe(true)
  })

  it.each([
    ['another schema', { ...makeRun(), schema: 2 }],
    ['no results', { ...makeRun(), results: undefined }],
    ['a spaces_url that is not a URL', { ...makeRun(), spaces_url: 'nope' }],
    ['an array', [makeRun()]],
    ['null', null]
  ])('refuses %s', (_name, value) => {
    expect(isRunRecord(value)).toBe(false)
  })
})

describe('collectionUrlOf', () => {
  it('builds the records Collection URL, with or without a trailing slash', () => {
    expect(collectionUrlOf({ serverUrl: 'https://freewallet.me/' })).toBe(
      'https://freewallet.me/space/perf-results/runs/'
    )
    expect(collectionUrlOf({ serverUrl: 'http://localhost:4455' })).toBe(
      'http://localhost:4455/space/perf-results/runs/'
    )
  })
})
