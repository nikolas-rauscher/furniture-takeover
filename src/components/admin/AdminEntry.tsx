import { BadgeCheck, ChevronRight } from "../icons";
import { Button } from "../ui/button";
import "./admin.css";

/** The settings row that leads administrators to the admin area. */
export default function AdminEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      className="settings-row admin-entry"
      data-tone="sky"
      onClick={onOpen}
    >
      <span className="settings-row-icon" aria-hidden="true">
        <BadgeCheck size={22} />
      </span>
      <span className="settings-row-text">
        <strong>Admin</strong>
        <small>Demo catalog, sellers, reports and blocks.</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Button>
  );
}
