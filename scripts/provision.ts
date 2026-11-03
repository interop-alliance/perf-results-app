/**
 * Makes the results Space, its `runs` Collection, and the Collection's
 * public-read policy, each only when missing, so it is safe to run again,
 * after a server wipe for one.
 *
 * Usage: pnpm provision
 */
import { PreconditionFailedError } from '@interop/pws-client'
import { collectionId, spaceId } from '../src/collection.ts'
import { collectionUrl, connect, serverUrl } from './config.ts'

const { pws, did } = await connect()
const space = pws.space(spaceId)

try {
  await space.replaceDescription(
    { name: 'Perf results', controller: did },
    { ifNoneMatch: true }
  )
  console.log(`Created the Space ${space.url}`)
} catch (err) {
  if (!(err instanceof PreconditionFailedError)) {
    throw err
  }
  // A Space another key controls reads as absent to this one.
  if ((await space.describe()) === null) {
    throw new Error(
      `${space.url} exists under another controller than ${did}. ` +
        'Is PERF_RESULTS_SECRET the key that made it?',
      { cause: err }
    )
  }
  console.log(`The Space ${space.url} is already there.`)
}

const collection = space.collection(collectionId)
// The controller reads every Collection of its Space, so null is absent.
if ((await collection.describe()) === null) {
  await space.createCollection({ id: collectionId, name: 'Run records' })
  console.log(`Created the Collection ${collectionUrl()}`)
} else {
  console.log(`The Collection ${collectionUrl()} is already there.`)
}

if (await collection.isPublic()) {
  console.log('The Collection is already public.')
} else {
  await collection.setPublic()
  console.log('Made the Collection public: anyone can list and read it.')
}

console.log(`Ready on ${serverUrl()}, controlled by ${did}.`)
