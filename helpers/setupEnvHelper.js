const path = require('path')
const fs = require('fs')

function setupEnvHelper({ envPath } = {}) {
  envPath = envPath || path.join(__dirname, '../', '../', '.env.variables')
  let file
  try {
    file = fs.readFileSync(envPath).toString()
  } catch (e) {}
  if (file) {
    const dotenv = require('dotenv')
    const envConfig = dotenv.parse(file)
    // console.log('envConfig', envConfig)
    for (const k in envConfig) {
      // console.log('checking env var', k, process.env[k])
      if (!process.env[k]) {
        process.env[k] = envConfig[k]
        // console.log('setting env var', k, envConfig[k])
      }
    }
  }
}

module.exports.setupEnvHelper = setupEnvHelper
