import { CONTENT_MAX_WIDTH } from '../../src/theme/spacing';
import { WIDE_CONTENT_MAX_WIDTH, layoutBreakpoints } from '../../src/theme/layout';
import { screenLayoutFor } from '../../src/utils/screenLayout';

/**
 * Tests for the portrait/landscape layout rule (W-22; SPEC D-49, US-08.02).
 * The sizes are typical window sizes in points; whether the screens really
 * look right in each layout is checked on the emulator and simulator
 * (TEST_REPORT §3, UX-21, UX-22, UX-26, UX-33).
 */

describe('screenLayoutFor', () => {
  it('gives a normal phone in portrait one column with the normal width', () => {
    expect(screenLayoutFor({ width: 390, height: 844 })).toEqual({
      orientation: 'portrait',
      isCompactWidth: false,
      isShortHeight: false,
      columns: 1,
      contentMaxWidth: CONTENT_MAX_WIDTH,
    });
  });

  it('marks a small phone in portrait as compact width (header buttons under the title)', () => {
    expect(screenLayoutFor({ width: 320, height: 568 })).toMatchObject({
      orientation: 'portrait',
      isCompactWidth: true,
      columns: 1,
    });
  });

  it('gives a phone in landscape two columns and the compact hero', () => {
    expect(screenLayoutFor({ width: 844, height: 390 })).toEqual({
      orientation: 'landscape',
      isCompactWidth: false,
      isShortHeight: true,
      columns: 2,
      contentMaxWidth: WIDE_CONTENT_MAX_WIDTH,
    });
  });

  it('keeps one column on a small phone in landscape, but with the compact hero', () => {
    expect(screenLayoutFor({ width: 568, height: 320 })).toEqual({
      orientation: 'landscape',
      isCompactWidth: false,
      isShortHeight: true,
      columns: 1,
      contentMaxWidth: CONTENT_MAX_WIDTH,
    });
  });

  it('keeps one column on a tablet in portrait, even though it is wide', () => {
    expect(screenLayoutFor({ width: 820, height: 1180 })).toMatchObject({ orientation: 'portrait', columns: 1 });
  });

  it('gives a tablet in landscape two columns without the compact hero', () => {
    expect(screenLayoutFor({ width: 1180, height: 820 })).toMatchObject({
      orientation: 'landscape',
      columns: 2,
      isShortHeight: false,
    });
  });

  it('treats a square window as portrait', () => {
    expect(screenLayoutFor({ width: 600, height: 600 }).orientation).toBe('portrait');
  });

  describe('breakpoints', () => {
    const { compactWidth, shortHeight, twoColumnMinWidth } = layoutBreakpoints;

    it('is compact width just below the breakpoint, not at it', () => {
      expect(screenLayoutFor({ width: compactWidth - 1, height: 800 }).isCompactWidth).toBe(true);
      expect(screenLayoutFor({ width: compactWidth, height: 800 }).isCompactWidth).toBe(false);
    });

    it('is short height just below the breakpoint, not at it', () => {
      expect(screenLayoutFor({ width: 900, height: shortHeight - 1 }).isShortHeight).toBe(true);
      expect(screenLayoutFor({ width: 900, height: shortHeight }).isShortHeight).toBe(false);
    });

    it('switches to two columns in landscape exactly at the minimum width', () => {
      expect(screenLayoutFor({ width: twoColumnMinWidth - 1, height: 400 }).columns).toBe(1);
      expect(screenLayoutFor({ width: twoColumnMinWidth, height: 400 }).columns).toBe(2);
    });

    it('uses the wide content width only with two columns', () => {
      expect(screenLayoutFor({ width: twoColumnMinWidth - 1, height: 400 }).contentMaxWidth).toBe(CONTENT_MAX_WIDTH);
      expect(screenLayoutFor({ width: twoColumnMinWidth, height: 400 }).contentMaxWidth).toBe(WIDE_CONTENT_MAX_WIDTH);
    });
  });

  describe('unusual sizes', () => {
    it.each([
      [0, 0],
      [0, 800],
      [390, 0],
      [-390, 844],
      [Number.NaN, 844],
      [390, Number.POSITIVE_INFINITY],
      // Without the finiteness check this one would become a two-column landscape layout.
      [Number.POSITIVE_INFINITY, 844],
    ])('falls back to the single-column portrait layout for %p × %p', (width, height) => {
      expect(screenLayoutFor({ width, height })).toEqual({
        orientation: 'portrait',
        isCompactWidth: false,
        isShortHeight: false,
        columns: 1,
        contentMaxWidth: CONTENT_MAX_WIDTH,
      });
    });
  });
});
