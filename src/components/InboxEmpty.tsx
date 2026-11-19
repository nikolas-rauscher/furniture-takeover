import Pako from "./onboarding/Pako";
import { Button } from "./ui/button";

/** The inbox before its first conversation: Pako says where conversations start and leads there. */
export default function InboxEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="empty-state inbox-start">
      <Pako mood="wave" size={112} />
      <h2>No conversations yet</h2>
      <p>
        Open a listing and choose Message seller to start one. Pako reads the
        replies and drafts your answers; you tap Send.
      </p>
      <Button variant="default" onClick={onBrowse}>
        Browse listings
      </Button>
    </div>
  );
}
