import { validateCoordinates } from '../../src/utils/coordinateValidation';

/**
 * Tests for `validateCoordinates` (W-03, W-30).
 *
 * Valid input must give the exact numbers; every invalid field must give
 * its own error, so nothing invalid is ever sent to the API.
 */

describe('validateCoordinates', () => {
  describe('valid input', () => {
    it.each([
      ['59.33', '18.07', 59.33, 18.07],
      ['-33.87', '151.21', -33.87, 151.21],
      ['59,33', '18,07', 59.33, 18.07],
      ['  59.33 ', '\t18.07\n', 59.33, 18.07],
      ['59', '18', 59, 18],
      ['+59.33', '+18.07', 59.33, 18.07],
      ['0', '0', 0, 0],
    ])('accepts %j, %j', (latitudeText, longitudeText, latitude, longitude) => {
      expect(validateCoordinates(latitudeText, longitudeText)).toEqual({
        isValid: true,
        coordinates: { latitude, longitude },
      });
    });
  });

  describe('geographic bounds', () => {
    it.each([
      ['90', '180'],
      ['-90', '-180'],
      ['90.0', '-180.0'],
    ])('accepts the exact bounds %j, %j', (latitudeText, longitudeText) => {
      expect(validateCoordinates(latitudeText, longitudeText).isValid).toBe(true);
    });

    it.each(['90.0001', '-90.5', '91', '-1000'])('rejects latitude %j as out of range', (text) => {
      expect(validateCoordinates(text, '18.07')).toEqual({
        isValid: false,
        latitudeError: 'outOfRange',
        longitudeError: undefined,
      });
    });

    it.each(['180.1', '-181', '360'])('rejects longitude %j as out of range', (text) => {
      expect(validateCoordinates('59.33', text)).toEqual({
        isValid: false,
        latitudeError: undefined,
        longitudeError: 'outOfRange',
      });
    });
  });

  describe('missing input', () => {
    it.each(['', ' ', '\t\n'])('reports an empty latitude (%j)', (text) => {
      expect(validateCoordinates(text, '18.07')).toEqual({
        isValid: false,
        latitudeError: 'empty',
        longitudeError: undefined,
      });
    });

    it('reports an empty longitude', () => {
      expect(validateCoordinates('59.33', '')).toEqual({
        isValid: false,
        latitudeError: undefined,
        longitudeError: 'empty',
      });
    });

    it('reports both fields when both are empty', () => {
      expect(validateCoordinates('', '  ')).toEqual({
        isValid: false,
        latitudeError: 'empty',
        longitudeError: 'empty',
      });
    });
  });

  describe('malformed input', () => {
    it.each([
      'abc',
      '59.3.3',
      '59,33,1',
      '1e2',
      '0x10',
      'Infinity',
      'NaN',
      '59.',
      '.5',
      '--5',
      '5 9',
      '59.33°',
    ])('rejects %j as not a number', (text) => {
      expect(validateCoordinates(text, '18.07')).toEqual({
        isValid: false,
        latitudeError: 'notANumber',
        longitudeError: undefined,
      });
    });
  });

  describe('both fields invalid', () => {
    it('reports an error for each field, not only the first', () => {
      expect(validateCoordinates('abc', '200')).toEqual({
        isValid: false,
        latitudeError: 'notANumber',
        longitudeError: 'outOfRange',
      });
    });
  });

  describe('error order', () => {
    it('reports empty before checking the format', () => {
      expect(validateCoordinates('   ', '18')).toMatchObject({ latitudeError: 'empty' });
    });

    it('reports notANumber before checking the range', () => {
      // "999e9" would be far out of range as a number, but it is not a valid format.
      expect(validateCoordinates('999e9', '18')).toMatchObject({ latitudeError: 'notANumber' });
    });
  });
});
