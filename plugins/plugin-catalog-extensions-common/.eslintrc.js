module.exports = {
  ...require('@backstage/cli/config/eslint'),
  parserOptions: {
    ...require('@backstage/cli/config/eslint').parserOptions,
    tsconfigRootDir: __dirname,
    project: ['../../tsconfig.json'],
  },
};
