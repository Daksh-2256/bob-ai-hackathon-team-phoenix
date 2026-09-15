module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2022',
        module: 'CommonJS',
        lib: ['ES2022'],
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true
      }
    }
  }
};
