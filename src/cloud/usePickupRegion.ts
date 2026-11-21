import { useEffect, useState } from "react";
import type { AccountConnection } from "./connection";

/** Where a signed-in seller usually hands items over, from their account profile. */
export function usePickupRegion(account: AccountConnection | undefined) {
  const [pickupRegion, setPickupRegion] = useState("");
  const client = account?.client;
  const userId = account?.session?.user.id;
  useEffect(() => {
    let alive = true;
    if (client && userId)
      void client
        .from("account_preferences")
        .select("pickup_region")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (alive && data) setPickupRegion(data.pickup_region);
        });
    return () => {
      alive = false;
    };
  }, [client, userId]);
  return [pickupRegion, setPickupRegion] as const;
}
