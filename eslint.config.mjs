import next from 'eslint-config-next'

const config = [
  ...next,
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.agents/**',
      '**/coverage/**',
      'lib/supabase/database.types.ts',
    ],
  },
]

export default config
