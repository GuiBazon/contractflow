import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef();
export function voltarAoLogin() {
  if (navigationRef.isReady()) navigationRef.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
}
