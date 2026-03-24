/**
 * Standardized z-index scale for the entire application
 *
 * Use these constants instead of arbitrary z-index values
 * to ensure consistent modal/overlay stacking behavior
 *
 * ACTUAL USAGE IN THIS APP:
 * - Arena controls (chat/help buttons): 300
 * - Main modals (most components): overlay (9999)
 * - Session lock / banned screen: superCritical (99999)
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

  /**
   * Full-screen overlay modals (most modals in the app use this).
   * Must be above arena controls (300), navigation (100) and all game UI.
   */
  overlay: 9999,

  /**
   * Session lock / banned screen.
   * Must be above everything — rendered via createPortal to document.body.
   */
  superCritical: 99999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
