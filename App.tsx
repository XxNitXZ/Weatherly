import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * App root: providers and navigation only (STYLE.md §6). The screens and
 * their order are defined in `RootNavigator` (SPEC D-35). Each screen sets
 * its own status-bar style, because it depends on its background (light
 * icons on the sky, dark icons on the detail screen and in the search sheet).
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
