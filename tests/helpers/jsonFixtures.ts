import { AppError } from '../../src/models/AppError';

/** Pass as `value` to `copyWith` to delete the field instead of replacing it. */
export const REMOVE = Symbol('remove');

/**
 * Returns a deep copy of `source` with the value at `path` replaced, or
 * deleted when `value` is `REMOVE`. Lets each failure test change exactly one
 * thing in a real fixture. Example path: ['hourly', 'temperature_2m', 5].
 */
export function copyWith(
  source: unknown,
  path: ReadonlyArray<string | number>,
  value: unknown,
): unknown {
  const copy: unknown = JSON.parse(JSON.stringify(source));
  let node = copy as Record<string, unknown>;
  for (const key of path.slice(0, -1)) {
    node = node[key] as Record<string, unknown>;
  }
  const lastKey = path[path.length - 1];
  if (value === REMOVE) {
    delete node[lastKey];
  } else {
    node[lastKey] = value;
  }
  return copy;
}

/** Asserts that `parse()` throws an AppError of kind 'parse' that names `expectedPath`. */
export function expectParseError(parse: () => unknown, expectedPath: string): void {
  let caught: unknown;
  try {
    parse();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AppError);
  if (caught instanceof AppError) {
    expect(caught.kind).toBe('parse');
    expect(caught.message).toContain(expectedPath);
  }
}
