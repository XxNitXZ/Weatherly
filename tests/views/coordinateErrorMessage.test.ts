import { coordinateErrorMessage } from '../../src/views/components/CoordinateSearchForm';

/**
 * Tests for the user-facing coordinate error messages (W-03). The form
 * component itself is checked on the simulator (TEST_REPORT §1.4).
 */

describe('coordinateErrorMessage', () => {
  it.each([
    ['latitude', 'empty', 'Enter a latitude'],
    ['longitude', 'empty', 'Enter a longitude'],
    ['latitude', 'notANumber', 'Use a decimal number, e.g. 59.33'],
    ['longitude', 'notANumber', 'Use a decimal number, e.g. 18.07'],
    ['latitude', 'outOfRange', 'Latitude must be between -90 and 90'],
    ['longitude', 'outOfRange', 'Longitude must be between -180 and 180'],
  ] as const)('%s / %s → %j', (field, error, expected) => {
    expect(coordinateErrorMessage(field, error)).toBe(expected);
  });
});
