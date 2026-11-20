import { AppError, toAppError } from '../../src/models/AppError';

/**
 * Tests for `toAppError` (lab test area "error-state logic"): whatever a
 * ViewModel catches, its `error` state always holds an AppError (STYLE.md §8).
 */

describe('toAppError', () => {
  it('returns an AppError unchanged', () => {
    const original = new AppError('timeout', 'No response within 10000 ms');

    expect(toAppError(original)).toBe(original);
  });

  it('wraps a plain Error as kind "unknown" and keeps its message', () => {
    const result = toAppError(new TypeError('Cannot read properties of undefined'));

    expect(result).toBeInstanceOf(AppError);
    expect(result.kind).toBe('unknown');
    expect(result.message).toContain('Cannot read properties of undefined');
  });

  it('wraps a thrown string as kind "unknown"', () => {
    const result = toAppError('something broke');

    expect(result.kind).toBe('unknown');
    expect(result.message).toContain('something broke');
  });

  it('wraps undefined as kind "unknown"', () => {
    expect(toAppError(undefined).kind).toBe('unknown');
  });

  it('keeps instanceof working for AppError', () => {
    const error = new AppError('validation', 'Search query is empty');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
  });
});
