/**
 * Single source of truth for dashboard chart colors.
 * Both dashboard charts paint on HTML5 canvas and take hex strings in JS,
 * so their palette cannot be CSS variables.
 *
 * Values are copied verbatim from CategoryBreakdownChart.tsx DEFAULT_COLORS
 * (order is preserved as index determines legend assignment).
 */

export const CHART_COLORS = [
  '#E58C17',
  '#6B74F6',
  '#DAB500',
  '#5B8DDF',
  '#5A5A5A',
  '#35A3C8',
  '#E25555',
  '#58C46B',
  '#E07AD9',
];

export const CHART_AXIS = '#6B7280';
export const CHART_MUTED = '#9CA3AF';
