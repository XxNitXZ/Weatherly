import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import { interaction } from '../../theme/interaction';

export type CitySearchFormProps = {
  /** Called with the raw typed text; the ViewModel trims and checks it. */
  readonly onSubmit: (query: string) => void;
};

/**
 * Place-name field and search button (W-01). Presentational, like
 * `CoordinateSearchForm`: it keeps only the typed text. Searching, the empty
 * check and duplicate-request handling happen in `useSearchViewModel`.
 */
export function CitySearchForm({ onSubmit }: CitySearchFormProps) {
  const [query, setQuery] = useState('');

  function handleSubmit(): void {
    onSubmit(query);
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Place name</Text>
      <View style={styles.row}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. Göteborg"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Place name"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search for this place"
          onPress={handleSubmit}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    color: colors.text,
    fontSize: fontSize.body,
    backgroundColor: colors.background,
  },
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radius.s,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.m,
  },
  buttonPressed: {
    opacity: interaction.pressedOpacity,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
