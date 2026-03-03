import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width: SCREEN_WIDTH_FULL, height: SCREEN_HEIGHT_FULL } = Dimensions.get('screen');

export const Device = {
  // Screen dimensions
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH_FULL,
  SCREEN_HEIGHT_FULL,

  // Platform
  IS_IOS: Platform.OS === 'ios',
  IS_ANDROID: Platform.OS === 'android',
  IS_WEB: Platform.OS === 'web',

};

export default Device;
