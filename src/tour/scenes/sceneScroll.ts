/** Room left between a scrolled-to element and its scroller's edge. */
const MARGIN = 16;

type Block = "nearest" | "center";

function isScroller(element: Element) {
  if (element.scrollHeight <= element.clientHeight) return false;
  if (element === document.scrollingElement) return true;
  return /auto|scroll/.test(getComputedStyle(element).overflowY);
}

function viewOf(scroller: Element) {
  if (scroller !== document.scrollingElement)
    return scroller.getBoundingClientRect();
  return { top: 0, bottom: window.innerHeight, height: window.innerHeight };
}

/** How far a scroller moves so the box shows: as little as needed, or to its middle. */
function distance(
  box: DOMRect,
  view: Pick<DOMRect, "top" | "bottom" | "height">,
  block: Block,
) {
  if (block === "center")
    return box.top + box.height / 2 - (view.top + view.height / 2);
  if (box.top < view.top + MARGIN) return box.top - view.top - MARGIN;
  if (box.bottom > view.bottom - MARGIN)
    return Math.min(
      box.bottom - view.bottom + MARGIN,
      box.top - view.top - MARGIN,
    );
  return 0;
}

/**
 * Scrolls the scene's own scrollers until the element shows. Unlike
 * scrollIntoView it never moves the page around the phone.
 */
export function bringIntoView(
  element: HTMLElement,
  block: Block,
  behavior: ScrollBehavior,
) {
  for (
    let scroller = element.parentElement;
    scroller;
    scroller = scroller.parentElement
  ) {
    if (!isScroller(scroller)) continue;
    const top = distance(
      element.getBoundingClientRect(),
      viewOf(scroller),
      block,
    );
    if (top) scroller.scrollBy({ top, behavior });
  }
}

/**
 * The app scrolls new cards into view by itself. Inside a scene that would
 * also scroll the tour page around the phone, so the scene page keeps every
 * such scroll to its own scrollers.
 */
export function keepScrollsInScene() {
  Element.prototype.scrollIntoView = function scrollWithinScene(
    options?: boolean | ScrollIntoViewOptions,
  ) {
    if (!(this instanceof HTMLElement))
      throw new Error("A scene scrolls only HTML elements into view.");
    const settings = typeof options === "object" ? options : {};
    const behavior = settings.behavior === "smooth" ? "smooth" : "auto";
    bringIntoView(
      this,
      settings.block === "center" ? "center" : "nearest",
      behavior,
    );
  };
}
