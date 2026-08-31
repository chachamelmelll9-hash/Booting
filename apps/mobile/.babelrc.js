module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
            '@features': './src/features',
            '@shared': './src/shared',
          },
        },
      ],
    ],
  };
};
