import { useRef, useState, type RefObject } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { colors } from '../../theme/colors';
import { interaction } from '../../theme/interaction';
import { MIN_TOUCH_TARGET, radius, spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';
import {
  MAX_LATITUDE,
  MAX_LONGITUDE,
  MIN_LATITUDE,
  MIN_LONGITUDE,
  type CoordinateError,
} from '../../utils/coordinateValidation';

export type CoordinateField = 'latitude' | 'longitude';

/** The user-facing message for a rejected field (W-03). Views own the wording. */
export function coordinateErrorMessage(field: CoordinateField, error: CoordinateError): string {
  const isLatitude = field === 'latitude';
  switch (error) {
    case 'empty':
      return isLatitude ? 'Enter a latitude' : 'Enter a longitude';
    case 'notANumber':
      return `Use a decimal number, e.g. ${isLatitude ? '59.33' : '18.07'}`;
    case 'outOfRange':
      return isLatitude
        ? `Latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}`
        : `Longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}`;
  }
}

export type CoordinateSearchFormProps = {
  readonly latitudeError?: CoordinateError;
  readonly longitudeError?: CoordinateError;
  /** Called with the raw field texts; the ViewModel validates them. */
  readonly onSubmit: (latitudeText: string, longitudeText: string) => void;
};

/**
 * Two coordinate fields and a submit button (W-03). Presentational: it keeps
 * only the typed text and shows the errors it receives. Validation happens
 * in `useCoordinateSearchViewModel`.
 */
export function CoordinateSearchForm({
  latitudeError,
  longitudeError,
  onSubmit,
}: CoordinateSearchFormProps) {
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const longitudeInput = useRef<TextInputInstance>(null);

  function handleSubmit(): void {
    onSubmit(latitudeText, longitudeText);
  }

  return (
    <View style={styles.form}>
      <CoordinateInput
        label="Latitude"
        placeholder="59.33"
        value={latitudeText}
        onChangeText={setLatitudeText}
        errorMessage={latitudeError && coordinateErrorMessage('latitude', latitudeError)}
        returnKeyType="next"
        onSubmitEditing={() => longitudeInput.current?.focus()}
      />
      <CoordinateInput
        label="Longitude"
        placeholder="18.07"
        value={longitudeText}
        onChangeText={setLongitudeText}
        errorMessage={longitudeError && coordinateErrorMessage('longitude', longitudeError)}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        inputRef={longitudeInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Show weather for these coordinates"
        onPress={handleSubmit}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Show weather</Text>
      </Pressable>
    </View>
  );
}

type CoordinateInputProps = {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly errorMessage?: string;
  readonly returnKeyType: 'next' | 'done';
  readonly onSubmitEditing: () => void;
  readonly inputRef?: RefObject<TextInputInstance | null>;
};

/** One labelled field with its inline error message underneath. */
function CoordinateInput({
  label,
  placeholder,
  value,
  onChangeText,
  errorMessage,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}: CoordinateInputProps) {
  const hasError = errorMessage !== undefined;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        // The plain iOS number pad has no minus sign, so negative values
        // (south, west) would be impossible to type.
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCorrect={false}
        accessibilityLabel={label}
        accessibilityHint={errorMessage}
        style={[styles.input, hasError && styles.inputError]}
      />
      {hasError && (
        <Text style={styles.errorText} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.m,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    color: colors.text,
    fontSize: fontSize.body,
    backgroundColor: colors.background,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.small,
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
