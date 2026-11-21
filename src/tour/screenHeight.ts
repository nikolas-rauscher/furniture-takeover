/**
 * The height the tour lays its phone frames and its sheet out from. Phone browsers
 * grow and shrink the viewport while their bars collapse during a scroll; sizing
 * from that would resize the frames on every scroll. So on touch screens the height
 * is taken once, and again only when the width changes, which turning the phone
 * also does. With a mouse, a resized window is a real resize and is followed.
 */
export function holdScreenHeight(root: HTMLElement = document.documentElement) {
  const touch = window.matchMedia("(pointer: coarse)");
  let width = window.innerWidth;
  const hold = () =>
    root.style.setProperty("--tour-screen-height", `${window.innerHeight}px`);
  hold();
  window.addEventListener("resize", () => {
    if (touch.matches && window.innerWidth === width) return;
    width = window.innerWidth;
    hold();
  });
}
