import Mapbox, { StyleURL } from '@rnmapbox/maps';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? null;

let hasConfiguredMapbox = false;
let hasWarnedAboutMissingToken = false;

export const hasMapboxConfig = Boolean(mapboxAccessToken);

export const MAPBOX_STYLE_URLS = {
  light: StyleURL.Street,
  dark: StyleURL.Dark,
} as const;

export const getMapboxStyleURL = (scheme?: 'light' | 'dark' | null) =>
  scheme === 'dark' ? MAPBOX_STYLE_URLS.dark : MAPBOX_STYLE_URLS.light;

if (hasMapboxConfig && !hasConfiguredMapbox) {
  hasConfiguredMapbox = true;
  void Mapbox.setAccessToken(mapboxAccessToken).catch((error) => {
    console.error('Unable to configure Mapbox access token:', error);
  });
} else if (!hasMapboxConfig && !hasWarnedAboutMissingToken) {
  hasWarnedAboutMissingToken = true;
  console.warn(
    'Mapbox access token is not set. Define EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN before rendering the native gym map.',
  );
}
