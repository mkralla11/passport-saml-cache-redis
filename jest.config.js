module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 86,
      lines: 96,
      statements: 96,
    },
  },
}
