import { useState } from "react";
import { readDeveloperMode, writeDeveloperMode } from "./developerMode";

export function useDeveloperMode() {
  const [developerMode, setEnabled] = useState(() => {
    try {
      return readDeveloperMode(window.localStorage);
    } catch {
      return false;
    }
  });

  function setDeveloperMode(enabled: boolean) {
    setEnabled(enabled);
    try {
      writeDeveloperMode(window.localStorage, enabled);
    } catch {
      window.dispatchEvent(new CustomEvent("storage-failure"));
    }
  }

  return { developerMode, setDeveloperMode };
}
