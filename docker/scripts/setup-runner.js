const { /*spawn,*/ exec } = require('child_process')
// const path = require('path')
async function run() {
  const abortOnExit =
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production' || process.env.ABORT_ON_CONTAINER_EXIT
      ? '--abort-on-container-exit'
      : ''

  let command = exec(
    `docker-compose  --project-name ${process.env.COMPOSE_PROJECT_NAME} --project-directory ./docker/compose -f ./docker/compose/setup-runner.yml up ${abortOnExit} --build`,
    {
      env: {
        ...process.env,
        BASE_PWD: process.env.PWD,
        SSH_KEYS_PATH: process.env.SSH_KEYS_PATH || resolveTilde('~/.ssh'),
      },
    }
  )

  await waitForCommandStatusWithStdout(command, {
    onError: (code) => new Error(`Could not finishing running setup-runner.yml. code: ${code}`),
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

/**
 * Resolves paths that start with a tilde to the user's home directory.
 *
 * @param  {string} filePath '~/GitHub/Repo/file.png'
 * @return {string}          '/home/bob/GitHub/Repo/file.png'
 */
function resolveTilde(filePath) {
  const os = require('os')
  if (!filePath || typeof filePath !== 'string') {
    return ''
  }

  // '~/folder/path' or '~' not '~alias/folder/path'
  if (filePath.startsWith('~/') || filePath === '~') {
    return filePath.replace('~', os.homedir())
  }

  return filePath
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
