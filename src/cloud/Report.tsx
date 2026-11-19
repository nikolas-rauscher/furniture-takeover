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
  return (
    <div className="report">
      <Button className="report-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Cancel report" : "Report"}
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
            Submit report
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
