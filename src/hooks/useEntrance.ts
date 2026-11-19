import { useState, type AnimationEvent } from "react";

/**
 * An entrance that plays once. While `entering`, the element carries the class
 * that runs its CSS entrance; when that animation ends, the class goes. A page
 * kept alive in the background restarts every CSS animation when it shows
 * again, so without this its cards would rise in on each return.
 */
export function useEntrance(play: boolean) {
  const [entering, setEntering] = useState(play);
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setEntering(false);
  };
  return { entering, onAnimationEnd };
}
