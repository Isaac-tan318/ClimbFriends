// app.config.js
const MAPBOX_PLUGIN_NAME = '@rnmapbox/maps';

const upsertPlugin = (plugins, plugin) =>
  [plugin, ...(plugins ?? []).filter((entry) => (Array.isArray(entry) ? entry[0] : entry) !== MAPBOX_PLUGIN_NAME)];

// EXPO PASSES THE PARSED app.json TO THIS FUNCTION VIA { config }
module.exports = ({ config }) => {
  const variant = process.env.APP_VARIANT ?? 'production';

  // Consolidate the identifier and add the unique scheme
  const variantOptions = {
    development: {
      name: 'climbfriends (Dev)',
      identifier: 'com.isaactan.climbfriends.dev', 
      scheme: 'climbfriends-dev',
    },
    preview: {
      name: 'climbfriends (Preview)',
      identifier: 'com.isaactan.climbfriends.preview',
      scheme: 'climbfriends-preview',
    },
    production: {
      name: config.name,
      identifier: 'com.isaactan.climbfriends',
      scheme: 'climbfriends',
    },
  };

  const resolvedVariant = variantOptions[variant] ?? variantOptions.production;
  const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;
  const mapboxDownloadsToken = process.env.MAPBOX_DOWNLOADS_TOKEN ?? null;

  if (!mapboxAccessToken) {
    console.warn(
      'Mapbox access token is not set. Define EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN or the native gym map will not render.',
    );
  }

  if (!mapboxDownloadsToken) {
    console.warn(
      'Mapbox downloads token is not set. Define MAPBOX_DOWNLOADS_TOKEN for native builds or configure it as an EAS secret.',
    );
  }

  const mapboxPlugin = mapboxDownloadsToken
    ? [MAPBOX_PLUGIN_NAME, { RNMapboxMapsDownloadToken: mapboxDownloadsToken }]
    : MAPBOX_PLUGIN_NAME;

  return {
    ...config,
    name: resolvedVariant.name,
    scheme: resolvedVariant.scheme, // 1. Dynamic Scheme applied
    plugins: upsertPlugin(config.plugins, mapboxPlugin),
    ios: {
      ...config.ios,
      bundleIdentifier: resolvedVariant.identifier, // 2. iOS support added
    },
    android: {
      ...config.android,
      package: resolvedVariant.identifier, // 3. Android package applied
    },
  };
};