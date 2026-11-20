/** How the pitch shows the app: its own screens in a phone, or the intro's drawn scenes. */
const LOOKS = ["app", "illustrated"] as const;
export type TourLook = (typeof LOOKS)[number];

function isTourLook(value: string): value is TourLook {
  return LOOKS.some((look) => look === value);
}

/** The look asked for in the page address, `?look=illustrated`; the app's own screens otherwise. */
export function lookInAddress(search: string): TourLook {
  const look = new URLSearchParams(search).get("look");
  if (look === null) return "app";
  if (!isTourLook(look)) throw new Error(`Unknown tour look "${look}".`);
  return look;
}
