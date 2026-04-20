// babel.config.js  (veya package.json'da "type":"module" varsa: babel.config.cjs)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    env: {
      production: {
        plugins: [
          'react-native-paper/babel',
          // Üretimde console.log/debug/info kaldırılır (JS thread + Hermes)
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
  };
};
