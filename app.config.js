const appJson = require('./app.json');

const MAPBOX_PLUGIN_NAME = '@rnmapbox/maps';

const upsertPlugin = (plugins, plugin) =>
  [plugin, ...(plugins ?? []).filter((entry) => (Array.isArray(entry) ? entry[0] : entry) !== MAPBOX_PLUGIN_NAME)];

module.exports = () => {
  const config = appJson.expo;
  const variant = process.env.APP_VARIANT ?? 'production';

  const variantOptions = {
    development: {
      name: 'climbfriends (Dev)',
      androidPackage: 'com.isaactan.climbfriends.dev',
    },
    preview: {
      name: 'climbfriends (Preview)',
      androidPackage: 'com.isaactan.climbfriends.preview',
    },
    production: {
      name: config.name,
      androidPackage: 'com.isaactan.climbfriends',
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
    plugins: upsertPlugin(config.plugins, mapboxPlugin),
    android: {
      ...config.android,
      package: resolvedVariant.androidPackage,
    },
  };
};
