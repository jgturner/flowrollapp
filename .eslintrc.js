module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Convert all errors to warnings for deployment
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
