import { useEffect, useId, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import "./pickup-location-input.css";

export type PickupLocationInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function PickupLocationInput({
  value,
  onChange,
  disabled = false,
}: PickupLocationInputProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function locate() {
    if (!navigator.geolocation) {
      setMessage(
        "Location is unavailable in this browser. Enter your pickup area.",
      );
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage("Finding your area…");
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          }),
      );
      if (controller.signal.aborted) return;
      const response = await fetch("/api/location/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(10000),
        ]),
      });
      const result = (await response.json()) as {
        location?: string;
        error?: { message?: string };
      };
      if (
        !response.ok ||
        typeof result.location !== "string" ||
        !result.location.trim()
      )
        throw new Error(
          result.error?.message ||
            "Could not find your area. Enter a pickup location instead.",
        );
      onChange(result.location);
      setMessage("Area added. Adjust it to your preferred pickup spot.");
    } catch (error) {
      if (controller.signal.aborted) return;
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : null;
      setMessage(
        code === 1
          ? "Location permission was denied. Enter your pickup area."
          : code === 2
            ? "Your location is unavailable. Enter your pickup area."
            : code === 3
              ? "Location took too long. Try again or enter your pickup area."
              : error instanceof Error && error.name !== "TimeoutError"
                ? error.message
                : "Location took too long. Enter your pickup area.",
      );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <div className="pickup-location-field">
      <div className="pickup-location-heading">
        <label htmlFor={id}>Pickup location</label>
        <button
          type="button"
          onClick={locate}
          disabled={disabled || busy}
          aria-describedby={`${id}-help`}
        >
          <LocateFixed size={15} aria-hidden="true" />
          {busy ? "Locating…" : "Use my location"}
        </button>
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        autoComplete="street-address"
        placeholder="Area or public pickup spot"
        aria-describedby={`${id}-help ${id}-status`}
      />
      <p id={`${id}-help`} className="pickup-location-help">
        Use my location shares your area with OpenStreetMap. No house number is
        added.
      </p>
      <p id={`${id}-status`} className="pickup-location-status" role="status">
        {message}
      </p>
    </div>
  );
}
