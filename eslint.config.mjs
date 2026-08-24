import antfu from '@antfu/eslint-config'

export default antfu({
  jsonc: false,
  markdown: false,
  stylistic: false,
  yaml: false,
}, {
  ignores: [
    'src/auto-imports.d.ts',
    'src/components.d.ts',
  ],
  rules: {
    'antfu/consistent-chaining': 'off',
    'antfu/if-newline': 'off',
    'antfu/top-level-function': 'off',
    'no-console': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-exports': 'off',
    'perfectionist/sort-named-imports': 'off',
    'prefer-template': 'off',
    'regexp/no-unused-capturing-group': 'off',
    'vue/attributes-order': 'off',
    'vue/custom-event-name-casing': 'off',
    'vue/define-macros-order': 'off',
    'vue/html-self-closing': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
})
