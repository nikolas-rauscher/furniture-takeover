import { useEffect, useState } from "react";

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

/** The time of day, as the phone's status bar shows it; follows the minute. */
function useTimeOfDay() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(tick);
  }, []);
  return now;
}

function Signal() {
  return (
    <svg width="19" height="12" viewBox="0 0 19 12">
      <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.9" />
      <rect x="5.1" y="5.2" width="3.2" height="6.8" rx="0.9" />
      <rect x="10.2" y="2.7" width="3.2" height="9.3" rx="0.9" />
      <rect x="15.3" y="0" width="3.2" height="12" rx="0.9" />
    </svg>
  );
}

function Wireless() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12">
      <path d="M8.5 2.3c2.5 0 4.7 1 6.4 2.6l1.2-1.2A10.7 10.7 0 0 0 8.5.6 10.7 10.7 0 0 0 .9 3.7l1.2 1.2A9 9 0 0 1 8.5 2.3Z" />
      <path d="M8.5 5.6c1.6 0 3 .6 4.1 1.6l1.2-1.2a7.6 7.6 0 0 0-10.6 0l1.2 1.2c1.1-1 2.5-1.6 4.1-1.6Z" />
      <path d="M8.5 8.9c.7 0 1.3.3 1.8.7L8.5 11.4 6.7 9.6c.5-.4 1.1-.7 1.8-.7Z" />
    </svg>
  );
}

function Battery() {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="12"
        rx="3.8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      <rect x="2" y="2" width="16.5" height="9" rx="2.4" />
      <path
        d="M25 4.4c.9.3 1.5 1.1 1.5 2.1s-.6 1.8-1.5 2.1V4.4Z"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * Time on the left of the camera, signal, network and battery on its right.
 * A scene that keeps its own clock shows that time; the others show the time of day.
 */
export default function StatusBar({ sceneTime }: { sceneTime?: Date }) {
  const timeOfDay = useTimeOfDay();
  return (
    <div className="tour-status-bar" aria-hidden="true">
      <span className="tour-status-time">
        {CLOCK.format(sceneTime ?? timeOfDay)}
      </span>
      <span className="tour-status-icons">
        <Signal />
        <Wireless />
        <Battery />
      </span>
    </div>
  );
}
