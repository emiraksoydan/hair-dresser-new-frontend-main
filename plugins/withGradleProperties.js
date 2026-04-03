const { withGradleProperties } = require('@expo/config-plugins');

const withDisableResourceOptimizations = (config) => {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    const entries = [
      { key: 'android.enableResourceOptimizations', value: 'false' },
      { key: 'android.buildToolsVersion', value: '35.0.0' },
    ];

    for (const entry of entries) {
      const alreadySet = props.some(
        (p) => p.type === 'property' && p.key === entry.key
      );
      if (!alreadySet) {
        props.push({ type: 'property', key: entry.key, value: entry.value });
      }
    }

    return mod;
  });
};

module.exports = withDisableResourceOptimizations;
