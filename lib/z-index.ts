/**
 * Standardized z-index scale for the entire application
 *
 * Use these constants instead of arbitrary z-index values
 * to ensure consistent modal/overlay stacking behavior
 */

export const Z_INDEX = {
  /** Base content layer */
  base: 0,

  /** Floating elements like dropdowns, tooltips */
  dropdown: 100,

  /** Sticky headers, navigation */
  sticky: 150,

  /** Standard modals */
  modal: 200,

  /** Nested modals (modal on top of modal) */
  modalNested: 300,

  /** Toasts and notifications */
  toast: 400,

  /** Tooltips that need to be above everything */
  tooltip: 500,

  /** Critical overlays (loading screens, blocking dialogs) */
  critical: 1000,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
