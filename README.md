# passport-saml-cache-redis

<!--
![CI](https://github.com/mkralla11/passport-saml-cache-redis/workflows/CI/badge.svg)
 -->

A redis-backed cache provider for [passport-saml](https://github.com/node-saml/passport-saml).

## Usage

```
$ npm install passport-saml-cache-redis
```

Use the

```typescript
import { Strategy as SamlStrategy } from 'passport-saml'
import redisCacheProvider from 'redis-saml-cache-redis'

const Redis = require('ioredis')

// create a redis instance
const redisClient = Redis.createClient({
  host,
  port,
  password,
})

passport.use(
  new SamlStrategy({
    //... other passport-saml options,
    cacheProvider: redisCacheProvider(redis), // provide the redis instance
  })
)
```

## Configuration

The `redisCacheProvider` function accepts an optional second argument. The default options are as follows:

```typescript
redisCacheProvider(pool, {
  // The maximum age of a cache entry in milliseconds. Uses redis's TTL implementation under the hood.
  ttlMillis: 600000, // 10 minutes,
  // A logger to use. By default, messages are logged to console.
  // The logger should support at least `logger.info()` and `logger.error()` methods.
  logger: console,
})
```

# License

See LICENSE file
