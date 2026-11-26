import { layoutBreakpoints } from '../../src/theme/spacing';
import { screenLayoutFor, type ScreenLayout } from '../../src/utils/screenLayout';

/**
 * Tests for `screenLayoutFor` (W-22; SPEC D-50, US-08.02): when the home
 * header stacks its buttons and when the heroes become compact. The real
 * window sizes are points as `useWindowDimensions()` reports them.
 */

const NORMAL: ScreenLayout = { isCompactWidth: false, isShortHeight: false };
const { compactWidth, shortHeight } = layoutBreakpoints;

describe('screenLayoutFor', () => {
  describe('real windows', () => {
    it.each<[string, number, number, ScreenLayout]>([
      ['iPhone 16 portrait', 393, 852, NORMAL],
      ['iPhone 16 landscape', 852, 393, { isCompactWidth: false, isShortHeight: true }],
      ['iPhone SE portrait', 375, 667, NORMAL],
      ['iPhone SE landscape', 667, 375, { isCompactWidth: false, isShortHeight: true }],
      ['360-point Android phone portrait', 360, 780, { isCompactWidth: true, isShortHeight: false }],
      ['320-point phone portrait', 320, 568, { isCompactWidth: true, isShortHeight: false }],
      ['Pixel landscape', 915, 412, { isCompactWidth: false, isShortHeight: true }],
      ['iPad landscape', 1180, 820, NORMAL],
    ])('%s (%p × %p)', (_name, width, height, expected) => {
      expect(screenLayoutFor({ width, height, fontScale: 1 })).toEqual(expected);
    });
  });

  describe('breakpoints', () => {
    it('is compact just below the width limit and not at it', () => {
      expect(screenLayoutFor({ width: compactWidth - 1, height: 800, fontScale: 1 }).isCompactWidth).toBe(true);
      expect(screenLayoutFor({ width: compactWidth, height: 800, fontScale: 1 }).isCompactWidth).toBe(false);
    });

    it('is short just below the height limit and not at it', () => {
      expect(screenLayoutFor({ width: 800, height: shortHeight - 1, fontScale: 1 }).isShortHeight).toBe(true);
      expect(screenLayoutFor({ width: 800, height: shortHeight, fontScale: 1 }).isShortHeight).toBe(false);
    });

    it('treats a square window by its size alone', () => {
      expect(screenLayoutFor({ width: 400, height: 400, fontScale: 1 })).toEqual({
        isCompactWidth: false,
        isShortHeight: true,
      });
    });
  });

  describe('text size', () => {
    it('stacks the header on a normal phone when the text is much larger', () => {
      // 393 < 375 × 1.3 = 487.5
      expect(screenLayoutFor({ width: 393, height: 852, fontScale: 1.3 }).isCompactWidth).toBe(true);
    });

    it('grows the width limit exactly with the text size', () => {
      // 375 × 1.5 = 562.5
      expect(screenLayoutFor({ width: 562, height: 852, fontScale: 1.5 }).isCompactWidth).toBe(true);
      expect(screenLayoutFor({ width: 563, height: 852, fontScale: 1.5 }).isCompactWidth).toBe(false);
    });

    it('never makes a narrow window wide with smaller text', () => {
      expect(screenLayoutFor({ width: 360, height: 780, fontScale: 0.85 }).isCompactWidth).toBe(true);
    });

    it('does not change the height decision', () => {
      expect(screenLayoutFor({ width: 852, height: 393, fontScale: 2 }).isShortHeight).toBe(true);
      expect(screenLayoutFor({ width: 393, height: 852, fontScale: 2 }).isShortHeight).toBe(false);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('counts an unusable text size %p as 1', (fontScale) => {
      expect(screenLayoutFor({ width: 360, height: 780, fontScale })).toEqual({
        isCompactWidth: true,
        isShortHeight: false,
      });
      expect(screenLayoutFor({ width: 393, height: 852, fontScale })).toEqual(NORMAL);
    });
  });

  describe('unusable window sizes', () => {
    it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'gives the normal layout for width %p',
      (width) => {
        expect(screenLayoutFor({ width, height: 300, fontScale: 1 })).toEqual(NORMAL);
      },
    );

    it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'gives the normal layout for height %p',
      (height) => {
        expect(screenLayoutFor({ width: 320, height, fontScale: 1 })).toEqual(NORMAL);
      },
    );

    it('gives the normal layout before the first layout pass (0 × 0)', () => {
      expect(screenLayoutFor({ width: 0, height: 0, fontScale: 0 })).toEqual(NORMAL);
    });
  });
});
