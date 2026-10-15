import next from 'eslint-config-next'

export default [
  ...next,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.agents/**',
      '**/coverage/**',
      '**/dist/**',
      'packages/db/src/database.types.ts',
    ],
  },
]
