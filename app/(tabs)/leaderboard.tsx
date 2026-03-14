import { Redirect } from 'expo-router';

export default function LeaderboardRedirectScreen() {
  return <Redirect href={{ pathname: '/(tabs)', params: { homeTab: 'ranks' } }} />;
}
