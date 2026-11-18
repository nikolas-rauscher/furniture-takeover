import { MessageCircle } from "./icons";
import { Button } from "./ui/button";

/** The inbox before its first conversation: says where conversations start and leads there. */
export default function InboxEmpty({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="empty-state">
      <MessageCircle size={28} />
      <h2>No conversations yet</h2>
      <p>Open a listing and choose Message seller to start one.</p>
      <Button variant="default" onClick={onBrowse}>
        Browse listings
      </Button>
    </div>
  );
}
