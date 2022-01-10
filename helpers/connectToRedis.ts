const Redis = require('ioredis')
const { promisify } = require('util')
import IORedis from 'ioredis'

export interface redisCredsInterface {
  host: string
  port?: string
  password: string
}

export interface connectToRedisArg {
  redisCreds: redisCredsInterface
}

type connectToRedisFn = (connectToRedisArg: connectToRedisArg) => Promise<IORedis.Redis>

const connectToRedis: connectToRedisFn = async function connectToRedis({ redisCreds }) {
  const { host, port, password } = redisCreds
  // console.log("in connect", redisCreds)
  const redisClient = Redis.createClient({
    host,
    port,
    password,
  })

  const asyncAuth = promisify(redisClient.auth.bind(redisClient))
  await asyncAuth(password)

  return redisClient
}

export default connectToRedis
