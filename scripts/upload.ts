/**
 * Uploads run records to the results Collection, each as one JSON Resource
 * stored as is. Takes record files, or folders searched for `.json` files
 * (such as `ops/perf-results`). A record's id is its runner, the host it
 * measured and its start (`recordId` in src/record.ts), so uploading a record
 * again replaces it with the same content.
 *
 * Usage: pnpm upload <file or folder>...
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { JsonObject } from '@interop/pws-client'
import { collectionId, spaceId } from '../src/collection.ts'
import { isObject, isRunRecord, isValidId, recordId } from '../src/record.ts'
import { collectionUrl, connect } from './config.ts'

/**
 * Whether parsed JSON is an object. `JSON.parse` returns JSON values only, so
 * an object it returns is a JSON object, which the client stores as is.
 *
 * @param value {unknown}   a `JSON.parse` result
 * @returns {boolean}
 */
function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value)
}

/**
 * Lists the `.json` files under a path: the path itself when it is a file,
 * else every one in the folder and its subfolders, in name order.
 *
 * @param options {object}
 * @param options.path {string}
 * @returns {Promise<string[]>}
 */
async function jsonFiles({ path }: { path: string }): Promise<string[]> {
  if (!(await stat(path)).isDirectory()) {
    return [path]
  }
  const entries = await readdir(path, { recursive: true, withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => join(entry.parentPath, entry.name))
    .sort()
}

const paths = process.argv.slice(2)
if (paths.length === 0) {
  console.error('Pass the record files, or folders of them, to upload.')
  process.exit(1)
}
const files = (await Promise.all(paths.map(path => jsonFiles({ path })))).flat()

const { pws } = await connect()
const collection = pws.space(spaceId).collection(collectionId)
let uploaded = 0
for (const file of files) {
  let record: unknown
  try {
    record = JSON.parse(await readFile(file, 'utf8'))
  } catch (err) {
    throw new Error(`Cannot read the run record ${file}`, { cause: err })
  }
  if (!isJsonObject(record) || !isRunRecord(record)) {
    console.warn(`Skipping ${file}: not a schema 1 run record.`)
    continue
  }
  const id = recordId({ record })
  if (!isValidId({ id })) {
    throw new Error(`${file} makes the id ${id}, which the server refuses.`)
  }
  await collection.put(id, record)
  uploaded++
  console.log(`Uploaded ${file} as ${id}`)
}
console.log(
  `${uploaded} ${uploaded === 1 ? 'record' : 'records'} in ${collectionUrl()}`
)
