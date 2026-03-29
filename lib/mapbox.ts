export const hasMapboxConfig = false;

export const MAPBOX_STYLE_URLS = {
  light: '',
  dark: '',
} as const;

export const getMapboxStyleURL = (_scheme?: 'light' | 'dark' | null) => MAPBOX_STYLE_URLS.light;
