import { StyleSheet, Text, View } from 'react-native';
import { skyColors } from '../../theme/sky';
import { spacing } from '../../theme/spacing';
import { fontSize, fontWeight } from '../../theme/typography';

export type DetailRowProps = {
  /** What the value is, e.g. "Sunrise". */
  readonly label: string;
  /** The formatted value, e.g. "08:14", or "Not available" (SPEC D-38). */
  readonly value: string;
};

/**
 * One labelled value in a detail card on the sky (W-07): the label on the
 * left, the value on the right. Screen readers read the row as one item,
 * e.g. "Sunrise: 08:14". Both texts wrap instead of being cut off, so large
 * text stays readable. Used by the day detail screen (US-04.02, US-04.03).
 */
export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.m,
    rowGap: spacing.xs,
    paddingVertical: spacing.s,
  },
  label: {
    flexShrink: 1,
    color: skyColors.onSkyMuted,
    fontSize: fontSize.body,
  },
  value: {
    flexShrink: 1,
    color: skyColors.onSky,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
});
