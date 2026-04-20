const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Not: `abort-controller` için özel Metro yönlendirmesi kaldırıldı.
// Shim tüm importları tek dosyaya zorlayınca RTK Query + ESM/CJS birleşiminde
// "Cannot read property 'prototype' of undefined" hatasına yol açabiliyordu.
// Paket, kendi node_modules/abort-controller (event-target-shim ile) çözümünü kullanır.
// Hesap değişiminde iptal/AbortController sorunu tekrar ederse: app girişinde
// yalnızca global polyfill veya RTK sürüm güncellemesi tercih edin.

module.exports = withNativeWind(config, { input: './global.css' });
