const { withGradleProperties } = require('@expo/config-plugins');

const withDisableResourceOptimizations = (config) => {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    const alreadySet = props.some(
      (p) => p.type === 'property' && p.key === 'android.enableResourceOptimizations'
    );

    if (!alreadySet) {
      props.push({
        type: 'property',
        key: 'android.enableResourceOptimizations',
        value: 'false',
      });
    }

    return mod;
  });
};

module.exports = withDisableResourceOptimizations;
