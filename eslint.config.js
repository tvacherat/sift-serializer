const tseslint = require('@typescript-eslint/eslint-plugin');
const tseslintParser = require('@typescript-eslint/parser');
const eslintPluginJsdoc = require('eslint-plugin-jsdoc');
const eslintPluginPrettier = require('eslint-plugin-prettier');

module.exports = [
  // JSDOC
  eslintPluginJsdoc.configs['flat/requirements-typescript'],
  eslintPluginJsdoc.configs['flat/contents-typescript'],
  eslintPluginJsdoc.configs['flat/logical-typescript'],
  eslintPluginJsdoc.configs['flat/stylistic-typescript'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      jsdoc: eslintPluginJsdoc,
      prettier: eslintPluginPrettier,
    },
    rules: {
      // TYPESCRIPT
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { varsIgnorePattern: '^__.*', argsIgnorePattern: '^__.*' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        2,
        { checksVoidReturn: { attributes: false } },
      ],
      // PRETTIER
      'prettier/prettier': 'warn',
      // JSDOC
      'jsdoc/require-jsdoc': [
        'warn',
        {
          require: { FunctionDeclaration: true, MethodDefinition: true },
          checkConstructors: false,
        },
      ],
      'jsdoc/check-tag-names': ['warn', { definedTags: ['dev', 'link'] }],
      'jsdoc/match-description': 0,
      'jsdoc/require-example': 0,
      // CONSOLE LOGS
      'no-console': 'warn',
    },
  },
];
