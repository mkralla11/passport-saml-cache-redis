import redisCacheProvider, { RedisCacheProvider } from '../src'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import * as path from 'path'
import type { CacheItem } from 'node-saml'
import IORedis from 'ioredis'
import connectToRedis, { redisCredsInterface } from '../helpers/connectToRedis'

declare const process: {
  env: {
    REDIS_HOST: string
    REDIS_PORT?: string
    REDIS_PASSWORD: string
  }
}

describe('test suite', function () {
  const ttlMillis = 200
  const delay = promisify(setTimeout)

  let redis: IORedis.Redis
  let cache: RedisCacheProvider
  let getAsync: (key: string) => Promise<string | null>
  let saveAsync: (key: string, value: any) => Promise<CacheItem | null>
  let removeAsync: (key: string) => string | Promise<string | null>

  beforeAll(async function () {
    const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env

    const redisCreds: redisCredsInterface = {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
    }

    redis = await connectToRedis({
      redisCreds,
    })
  }, 60000)

  afterAll(async function () {
    // console.log(redis)
    await redis.quit()
  })

  beforeEach(async function () {
    // FLUSH ALL REDIS
    // console.log(redis)
    // @ts-ignore
    await redis.flushall('ASYNC')
    // KILL EVERYTHING
    await redis.client('KILL', 'TYPE', 'normal')
    await redis.client('KILL', 'TYPE', 'master')
    await redis.client('KILL', 'TYPE', 'slave')

    await redis.client('KILL', 'TYPE', 'pubsub')
    //((await redis.client('list')) as string).match(/(?<=id=)(\d+)/g)

    cache = redisCacheProvider(redis, { ttlMillis })
    removeAsync = cache.removeAsync
    getAsync = cache.getAsync
    saveAsync = cache.saveAsync
  }, 60000)

  afterEach(() => cache.closeAsync())

  describe('validation', () => {
    it('throws an error if ttlMillis is not a positive integer', () => {
      expect(() => redisCacheProvider(redis, { ttlMillis: -1 })).toThrowError('ttlMillis must be a positive integer')
      expect(() => redisCacheProvider(redis, { ttlMillis: 1.5 })).toThrowError('ttlMillis must be a positive integer')
    })
  })

  describe('getAsync()', () => {
    it('returns null if key does not exist', async function () {
      return expect(await getAsync('key')).toBeNull()
    })

    it('returns the value if key exists', async function () {
      await saveAsync('key', 'val')
      expect(await getAsync('key')).toBe('val')
    })
  })

  describe('saveAsync()', () => {
    it('returns the new value & timestamp if key does not exist', async function () {
      const res = await saveAsync('key', 'val')
      let value
      if (res !== null) {
        ;({ value } = res)
      }
      expect(value).toBe('val')
    })

    it('throws an error if key already exists', async function () {
      await saveAsync('key', 'val1')
      return expect(saveAsync('key', 'val2')).rejects.toThrow(new Error('duplicate key value is not allowed'))
    })
  })

  describe('removeAsync()', () => {
    it('returns null if key does not exist', async function () {
      expect(await removeAsync('key')).toBeNull()
    })

    it('returns the key if it existed', async function () {
      await saveAsync('key', 'val')
      expect(await removeAsync('key')).toBe('key')
      expect(await removeAsync('key')).toBeNull()
    })
  })

  describe('expiration', () => {
    it('deletes expired key automatically', async function () {
      await saveAsync('key', 'val')
      expect(await getAsync('key')).toBe('val')
      await delay(ttlMillis * 2)
      expect(await getAsync('key')).toBeNull()
    })
  })

  describe('error handling', () => {
    it('calls the callback with an error object if an error occurs', async function () {
      const mockRedis = {
        get: jest.fn(() => Promise.reject(new Error('Boom!'))),
        set: jest.fn(() => Promise.reject(new Error('Boom!'))),
        del: jest.fn(() => Promise.reject(new Error('Boom!'))),
      }

      const cache = redisCacheProvider(mockRedis as any, { ttlMillis })

      const error = new Error('Boom!')
      await expect(cache.getAsync('key')).rejects.toThrow(error)
      await expect(cache.saveAsync('key', 'value')).rejects.toThrow(error)
      await expect(cache.removeAsync('key')).rejects.toThrow(error)

      await delay(ttlMillis * 2) // Wait a bit. The cleanup job error should fire as well.
      cache.closeAsync()
    })
  })
})
