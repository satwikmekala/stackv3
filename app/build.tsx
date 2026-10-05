import { Redirect } from 'expo-router';

/** Preserve existing links while making Stack a stable top-level destination. */
export default function BuildRoute() {
  return <Redirect href="/(tabs)/stack" />;
}
