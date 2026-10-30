import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail } from "./client";
export default function Report({
  client,
  listingId,
  messageId,
}: {
  client: SupabaseClient;
  listingId?: string;
  messageId?: string;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  return (
    <div className="account-report">
      <button onClick={() => setOpen((v) => !v)}>
        {open ? "Cancel report" : "Report"}
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setNotice("");
            try {
              fail(
                (
                  await client.from("reports").insert({
                    listing_id: listingId ?? null,
                    message_id: messageId ?? null,
                    reason: text.trim(),
                  })
                ).error,
              );
              setNotice(
                "Report saved for the Takeover team. Reports do not automatically remove content.",
              );
              setOpen(false);
              setText("");
            } catch (err) {
              setNotice(
                err instanceof Error ? err.message : "Could not send report.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            What is wrong?
            <textarea
              required
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <button disabled={busy || !text.trim()}>Submit report</button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
