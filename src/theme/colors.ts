/**
 * Colour tokens (STYLE.md §12). Components use these names, never hex values.
 *
 * Minimal starting set, created for the first component (US-02.04) and
 * extended for the home screen (US-03.01). The visual design system is
 * defined in US-08.01 and replaces these values.
 */
export const colors = {
  background: '#FFFFFF',
  /** Cards and the inactive part of the search mode switch. */
  surface: '#F1F4F8',
  text: '#1B1F24',
  textMuted: '#5B6470',
  border: '#C4CAD2',
  primary: '#1F5FAD',
  onPrimary: '#FFFFFF',
  /** Background of a selected search result. */
  primarySubtle: '#E3EDF9',
  error: '#B3261E',
} as const;
