import { useEffect, useCallback } from 'react';

/**
 * Hook to handle Escape key press for closing modals
 *
 * @param onEscape - Callback function when Escape is pressed
 * @param isActive - Whether the handler should be active (default: true)
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
      }
    },
    [onEscape]
  );

  useEffect(() => {
    if (!isActive) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, isActive]);
}
