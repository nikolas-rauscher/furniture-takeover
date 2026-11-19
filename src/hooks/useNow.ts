import { useEffect, useState } from "react";
import { readDeveloperMode } from "../availability/developerMode.ts";

const pickupClockChanged = "takeover-pickup-clock";
let demoOffset: number | undefined;

/** Use from the local developer controls. Passing null restores the real clock. */
export function setDemoPickupClock(target: Date | null): void {
  if (target && !Number.isFinite(target.getTime())) throw new Error("Choose a valid demo time.");
  demoOffset = target ? target.getTime() - Date.now() : undefined;
  window.dispatchEvent(new Event(pickupClockChanged));
}

export function demoPickupNow(): Date | undefined {
  if (demoOffset === undefined || !readDeveloperMode(window.localStorage)) return undefined;
  return new Date(Date.now() + demoOffset);
}

/** A minute clock for reminders, with an optional developer-only local demo clock. */
export function useNow(demo = false): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener(pickupClockChanged, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(pickupClockChanged, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return (demo && demoPickupNow()) || now;
}
