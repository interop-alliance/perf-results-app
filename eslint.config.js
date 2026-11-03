import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * House rules every file follows, from CONTRIBUTING.md.
 */
const houseRules = {
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
  // Descriptive names; x and y are the chart's coordinates. Property names
  // are exempt, since SVG names its attributes d, r, x and y.
  'id-length': [
    'error',
    { min: 2, exceptions: ['x', 'y'], properties: 'never' }
  ],
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ConditionalExpression > ConditionalExpression',
      message: 'No nested ternaries: use an if-chain or a lookup table.'
    },
    {
      selector: 'Literal[value=/[^\\x00-\\x7F]/]',
      message: 'ASCII only: write -> and -- , not arrows or dashes.'
    },
    {
      selector: 'TemplateElement[value.raw=/[^\\x00-\\x7F]/]',
      message: 'ASCII only: write -> and -- , not arrows or dashes.'
    }
  ]
}

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      prettierConfig // must be last in extends
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: houseRules
  },
  // The page: browser globals, and the console only for warnings.
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] }
  },
  // The scripts and the tests run on Node.
  {
    files: ['scripts/**/*.ts', 'test/**/*.ts', 'vite.config.ts'],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['eslint.config.js', 'prettier.config.js'],
    extends: [js.configs.recommended, prettierConfig],
    languageOptions: { globals: globals.node }
  }
])
