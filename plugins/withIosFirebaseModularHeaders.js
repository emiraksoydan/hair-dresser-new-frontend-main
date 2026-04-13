/**
 * FirebaseAuth (Swift) + use_frameworks :static → CocoaPods modular header hatası için
 * Podfile'a global `use_modular_headers!` ekler.
 * @see https://guides.cocoapods.org/syntax/podfile.html#use_modular_headers_bang
 */
const { withPodfile } = require("expo/config-plugins");

module.exports = function withIosFirebaseModularHeaders(config) {
  return withPodfile(config, (config) => {
    let src = config.modResults.contents;
    if (src.includes("use_modular_headers!")) {
      return config;
    }
    const line = "use_frameworks! :linkage => :static";
    if (src.includes(line)) {
      src = src.replace(line, `${line}\nuse_modular_headers!`);
    } else {
      src = `use_modular_headers!\n${src}`;
    }
    config.modResults.contents = src;
    return config;
  });
};
