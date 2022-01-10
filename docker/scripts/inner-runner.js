const { spawn, exec } = require('child_process')
const { setupEnvHelper } = require(`../../helpers/setupEnvHelper`)
const { promisify } = require('util')
const fs = require('fs')
const readdir = promisify(fs.readdir.bind(fs))

function requireUncached(mod) {
  delete require.cache[require.resolve(mod)]
  return require(mod)
}

async function packageExists(name) {
  try {
    await readdir(`${__dirname}/../../node_modules/${name}`)
    return true
  } catch (e) {
    return false
  }
}

async function run() {
  let mainComposeCommand

  const isTest = process.env.NODE_ENV === 'test'

  const neededPackages = (
    await Promise.all(
      ['dotenv'].map(async (name) => {
        return {
          name,
          packageExists: await packageExists(name),
        }
      })
    )
  )
    .filter(({ packageExists }) => !packageExists)
    .map(({ name }) => name)

  const neededPackagesStr = neededPackages.join(' ')

  if (neededPackages.length) {
    let command = exec(`cd ../ && npm install --save-dev ${neededPackagesStr}`, {
      env: {
        ...process.env,
      },
    })

    await waitForCommandStatusWithStdout(command, {
      onError: () => new Error('Could not install needed packages on demand.'),
    })
    // refresh those modules
    neededPackages.map(requireUncached)
  }

  await preInstallPackagesToNamedVolume({
    extendEnv: {},
  })

  if (isTest) {
    const envPath = `${__dirname}/../compose/.env.test`
    // now, setup test env vars
    setupEnvHelper({ envPath })
  }

  if (process.env.MAIN_COMPOSE_COMMAND) {
    mainComposeCommand = process.env.MAIN_COMPOSE_COMMAND
  }

  // then, setup default dev env vars,
  // these will not override any previous
  // env vars that are set up
  setupEnvHelper()

  const composeArray = [
    '--project-name',
    process.env.COMPOSE_PROJECT_NAME,
    '--project-directory',
    './docker/compose',
    ...(mainComposeCommand ? ['-f', './docker/compose/redis.yml', '-f', './docker/compose/main.yml'] : []),
    ...(process.env.RERUN_COMMAND ? ['-f', './docker/compose/rerun.yml'] : []),
    'up',
    ...(isTest ? ['--abort-on-container-exit'] : []),
    '--build',
  ]
  console.log(composeArray)

  const child2 = spawn(`docker-compose`, composeArray, {
    cwd: process.env.PWD,
    env: {
      ...process.env,
      MAIN_COMPOSE_COMMAND: mainComposeCommand,
    },
    stdio: 'inherit',
  })

  child2.on('exit', (code) => {
    process.exit(code)
  })
}

function waitForCommandStatusWithStdout(command, { onError }) {
  command.stdout.pipe(process.stdout)
  command.stderr.pipe(process.stderr)

  return new Promise((resolve, reject) =>
    command.on('close', (code) => {
      if (code === null || code === 0) {
        resolve()
      } else {
        reject(onError(code))
      }
    })
  )
}

async function preInstallPackagesToNamedVolume({ extendEnv = {} } = {}) {
  let command = exec(
    `docker-compose  --project-name ${process.env.COMPOSE_PROJECT_NAME} --project-directory ./docker/compose -f ./docker/compose/pre-install-packages.yml up`,
    {
      env: {
        ...process.env,
        ...extendEnv,
      },
    }
  )

  await waitForCommandStatusWithStdout(command, {
    onError: (code) => new Error(`Could not pre-install node packages into named volume. code: ${code}`),
  })
}

// function delay(ms) {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve()
//     }, ms)
//   })
// }

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
