import { useEffect, useState } from "react";
import type { AccountConnection } from "./connection";

/** Where a signed-in seller usually hands items over, from their account profile. */
export function usePickupRegion(account: AccountConnection | undefined) {
  const [pickupRegion, setPickupRegion] = useState("");
  useEffect(() => {
    let alive = true;
    if (account?.session)
      void account.client
        .from("account_preferences")
        .select("pickup_region")
        .eq("user_id", account.session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (alive && data) setPickupRegion(data.pickup_region);
        });
    return () => {
      alive = false;
    };
  }, [account?.client, account?.session?.user.id]);
  return [pickupRegion, setPickupRegion] as const;
}
