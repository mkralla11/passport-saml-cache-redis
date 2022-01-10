import * as assert from 'assert'
// CANNOT USE CACHE PROVIDER FROM passport-saml,
// it is stale/not updatee with latest interface,
// must use package that the implementors split
// passport-saml off from, specifically node-saml types
import type { CacheProvider, CacheItem } from 'node-saml'
import IORedis from 'ioredis'
import { BinaryLike, createHash, randomBytes } from 'crypto'

// Make the key less prone to collision
function hashKey(key: BinaryLike): string {
  return `leader:${createHash('sha1').update(key).digest('hex')}`
}

function random(): string {
  return randomBytes(32).toString('base64')
}

export interface Logger {
  info: (message: string) => void
  error: (message: string, err: Error) => void
}
export interface Options {
  /**
   * The maximum age of a cache entry in milliseconds. Entries older than this are deleted automatically.
   * Redis automatically deletes entries using ttl redis option every `ttlMillis` milliseconds.
   *
   * Default value: 10 minutes.
   */
  ttlMillis?: number
  /** A logger to use. By default, messages are logged to console. */
  logger?: Logger
  key?: string
}

const defaultOptions: Required<Options> = {
  ttlMillis: 600000,
  logger: console,
  key: 'app',
}

export interface RedisCacheProvider extends CacheProvider {
  /** Close the cache. This stops the scheduled job that deletes old cache entries. */
  closeAsync: () => void
}

/** Create a new Redis cache provider for passport-saml. */
export default function redisCacheProvider(redis: IORedis.Redis, options?: Options): RedisCacheProvider {
  const { ttlMillis, logger, key } = { ...defaultOptions, ...options }
  const hashedKey = hashKey(key || random())

  assert.ok(Number.isInteger(ttlMillis) && ttlMillis > 0, 'ttlMillis must be a positive integer')

  return {
    getAsync: async function (key: string) {
      const item = await redis.get(`${hashedKey}:${key}`)
      if (item !== null) {
        const { value } = JSON.parse(item) as CacheItem
        return value
      } else {
        return null
      }
    },
    saveAsync: async function (key: string, value: string) {
      const item: CacheItem = {
        createdAt: new Date().getTime(),
        value,
      }

      const res = await redis.set(`${hashedKey}:${key}`, JSON.stringify(item), 'PX', ttlMillis, 'NX')
      if (res !== 'OK') {
        throw new Error('duplicate key value is not allowed')
      }

      return item
    },
    removeAsync: async function (key: string) {
      const deleteCount = await redis.del(`${hashedKey}:${key}`)
      return deleteCount > 0 ? key : null
      // pool
      //   .query<{ key: string }>('DELETE FROM passport_saml_cache WHERE key = $1 RETURNING key', [key])
      //   .then((result) => callback(null, result.rows[0]?.key ?? null))
      //   .catch((err) => callback(err, null as any))
    },
    closeAsync: async function () {},
  }
}
