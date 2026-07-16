import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

const recommended = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
]

export default tseslint.config([
  {
    ignores: [
      'dist',
      'playwright-report',
      'test-results',
      'src-tauri/target',
      'src/components/workspace/VersionPanel.vue.backup',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: recommended,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.vue'],
    extends: recommended,
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
  },
  {
    // Keep known pre-existing debt scoped to the files that already own it.
    files: [
      'scripts/check-database.ts',
      'src/components/BookWorkspace.vue',
      'src/models/DiffEngine.ts',
      'src/models/DocumentManager.ts',
      'src/models/TimelineManager.ts',
      'src/services/fileSystemService.ts',
      'src/services/webAdapter.ts',
      'src/types/timeline.ts',
      'src/utils/editorThemes.ts',
      'src/vue-shim.d.ts',
    ],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
    },
  },
])
