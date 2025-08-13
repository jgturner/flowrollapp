module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Temporarily disable some rules for deployment
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/no-unescaped-entities': 'warn',
    '@next/next/no-img-element': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
