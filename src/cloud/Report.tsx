import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail } from "./client";
import "./report.css";
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
  const target = messageId ? "message" : "listing";
  return (
    <div className="report">
      <Button className="report-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Cancel report" : `Report ${target}`}
      </Button>
      {open && (
        <form
          className="report-form"
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
              setNotice("Report received. The takeover team can review it.");
              setOpen(false);
              setText("");
            } catch (err) {
              console.error(err);
              setNotice("Couldn't send your report. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Why are you reporting this {target}?
            <Textarea
              required
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            className="button danger small"
            disabled={busy || !text.trim()}
          >
            Send report
          </Button>
        </form>
      )}
      {notice && (
        <p className="report-notice" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
