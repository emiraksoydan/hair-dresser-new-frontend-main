/**
 * RNFirebase + use_frameworks/static + use_modular_headers!:
 * - CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES (tüm pod target'lar)
 * - RNFBApp/RNFBAuth/RNFBMessaging için CLANG_ENABLE_MODULES=NO → Xcode 16+ / iOS 26 SDK'da
 *   "RCTPromiseRejectBlock must be imported from module RNFBApp.RNFBAppModule" ve
 *   ardından gelen RCT_EXPORT_* zincir hatalarını önler (PrecompileModule + modül sınırı).
 *
 * Podfile post_install içine (react_native_post_install öncesi) enjekte edilir.
 */
const { withPodfile } = require("expo/config-plugins");

const BEGIN = "# @generated begin expo-rnfb-ios-archive-fix";
const END = "# @generated end expo-rnfb-ios-archive-fix";

function stripLegacyBlocks(src) {
  return src
    .replace(
      /\n# --- Expo: RNFirebase \+ static frameworks \(non-modular React headers\) ---\s*\npost_integrate do \|installer\|[\s\S]*?^end\s*\n/m,
      "\n"
    )
    .replace(
      /\n\s*# @generated begin expo-rnfb-non-modular-includes[\s\S]*?#\s*@generated end expo-rnfb-non-modular-includes\s*\n/g,
      "\n"
    );
}

function ensureRNFirebaseStaticFramework(src) {
  if (src.includes("$RNFirebaseAsStaticFramework")) return src;
  const m = src.match(/^(platform :ios[^\n]*\n)/m);
  if (!m) return src;
  return src.replace(m[0], `${m[0]}$RNFirebaseAsStaticFramework = true\n`);
}

function injectBody(baseIndent) {
  const b = baseIndent + "  ";
  const b2 = baseIndent + "    ";
  const b3 = baseIndent + "      ";
  return [
    "",
    `${b}${BEGIN}`,
    `${b}installer.pods_project.targets.each do |target|`,
    `${b2}target.build_configurations.each do |config|`,
    `${b3}config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"`,
    `${b2}end`,
    `${b}end`,
    `${b}installer.pods_project.build_configurations.each do |config|`,
    `${b2}config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"`,
    `${b}end`,
    `${b}%w[RNFBApp RNFBAuth RNFBMessaging].each do |pod_name|`,
    `${b2}t = installer.pods_project.targets.find { |x| x.name == pod_name }`,
    `${b2}next unless t`,
    `${b2}t.build_configurations.each do |config|`,
    `${b3}config.build_settings["CLANG_ENABLE_MODULES"] = "NO"`,
    `${b2}end`,
    `${b}end`,
    `${b}${END}`,
    "",
  ].join("\n");
}

module.exports = function withIosAllowNonModularIncludes(config) {
  return withPodfile(config, (config) => {
    let src = ensureRNFirebaseStaticFramework(stripLegacyBlocks(config.modResults.contents));

    const re = /^(\s*)post_install\s+do\s+\|installer\|\s*$/m;
    const match = src.match(re);
    if (!match) {
      throw new Error(
        "[withIosAllowNonModularIncludes] Podfile'da 'post_install do |installer|' bulunamadı; Expo iOS şablonu bekleniyor."
      );
    }

    const baseIndent = match[1] || "";
    if (src.includes(BEGIN)) {
      config.modResults.contents = src;
      return config;
    }

    src = src.replace(re, `${baseIndent}post_install do |installer|${injectBody(baseIndent)}`);

    config.modResults.contents = src;
    return config;
  });
};
