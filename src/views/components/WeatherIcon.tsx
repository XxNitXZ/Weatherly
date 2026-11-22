import { MaterialCommunityIcons } from '@expo/vector-icons';
import { skyColors } from '../../theme/sky';
import type { WeatherIconName } from '../../utils/weatherIcon';

export type WeatherIconProps = {
  readonly name: WeatherIconName;
  readonly size: number;
  readonly color?: string;
};

/**
 * Draws a weather icon chosen by `weatherIconName` (SPEC D-34). Decorative:
 * hidden from screen readers, because every place that shows an icon also
 * has the condition as text in its accessibility label (STYLE.md §15).
 */
export function WeatherIcon({ name, size, color = skyColors.onSky }: WeatherIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
