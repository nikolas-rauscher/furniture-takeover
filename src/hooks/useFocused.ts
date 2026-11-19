import { useSyncExternalStore, type RefObject } from "react";

function subscribeToFocus(onChange: () => void) {
  document.addEventListener("focusin", onChange);
  document.addEventListener("focusout", onChange);
  return () => {
    document.removeEventListener("focusin", onChange);
    document.removeEventListener("focusout", onChange);
  };
}

/**
 * Whether the referenced element has focus. It follows focus anywhere on the
 * page, also when the element is removed while focused; only a change of its
 * own focus renders again.
 */
export function useFocused(ref: RefObject<HTMLElement | null>): boolean {
  return useSyncExternalStore(
    subscribeToFocus,
    () => ref.current !== null && document.activeElement === ref.current,
  );
}
