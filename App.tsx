import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/views/screens/HomeScreen';

/**
 * App root: providers and the first screen only (STYLE.md §6). Each screen
 * sets its own status-bar style, because it depends on its background
 * (light icons on the sky, dark icons in the search sheet).
 * Navigation between screens is added in NIT-173.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <HomeScreen />
    </SafeAreaProvider>
  );
}
