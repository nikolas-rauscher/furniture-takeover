import { useState } from "react";
import { adminFailure } from "./useAdminResource";

/**
 * One admin change in flight: while it runs the control waits, and when the
 * server refuses it the reason stays beside the control until the next try.
 */
export function useAdminAction() {
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState("");
  async function run(change: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setRefusal("");
    try {
      await change();
      return true;
    } catch (error) {
      setRefusal(adminFailure(error));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, refusal, run, clear: () => setRefusal("") };
}
