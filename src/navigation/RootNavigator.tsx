import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { skyColors, skyHeaderColor } from '../theme/sky';
import { DayDetailScreen } from '../views/screens/DayDetailScreen';
import { FavoritesScreen } from '../views/screens/FavoritesScreen';
import { HomeScreen } from '../views/screens/HomeScreen';
import type { RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The app's only navigator: one native stack (SPEC D-35).
 *
 * - `Home` is the root. Its native header is hidden because the screen draws
 *   its own header on the sky background.
 * - `DayDetail` and `Favorites` are pushed on top with the native header, so
 *   iOS shows a back button and allows swiping back, and Android's back
 *   button works. The `DayDetail` header is coloured like the top of the day
 *   sky, with a white title and back arrow and no divider, so it blends into
 *   the screen (NIT-232).
 *
 * `HomeScreen` stays mounted underneath a pushed screen, so the selected
 * place, its forecast and the scroll position are still there after going
 * back, and no new request is sent.
 */
export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="DayDetail"
        component={DayDetailScreen}
        options={({ route }) => ({
          title: route.params.location.name,
          headerStyle: { backgroundColor: skyHeaderColor },
          headerTintColor: skyColors.onSky,
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favourites' }} />
    </Stack.Navigator>
  );
}
