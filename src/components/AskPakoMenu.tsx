import { ChevronDown, Sparkles } from "@/components/icons";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Polishing the description is also offered once Pako has asked everything. */
export const POLISH_DESCRIPTION = {
  label: "Polish the description",
  request:
    "Improve my description using the photos and details I provided. Keep it concise and natural.",
};

export type PakoRequest = { label: string; request: string };

/** What the student can ask about a listing being written. */
export const LISTING_REQUESTS: readonly PakoRequest[] = [
  {
    label: "Find similar listings",
    request: "Research comparable individual secondhand offers for this item.",
  },
  {
    label: "Suggest a price",
    request:
      "Research comparable asking prices and suggest a price for this listing.",
  },
  {
    label: "Check listing",
    request:
      "Check my listing for missing condition, dimensions and pickup details.",
  },
  POLISH_DESCRIPTION,
];

/** What the student can ask Pako at any time; each costs one request. */
export default function AskPakoMenu({
  requests,
  disabled,
  onAsk,
}: {
  requests: readonly PakoRequest[];
  disabled: boolean;
  onAsk: (request: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="ask-pako" />}
        disabled={disabled}
        aria-label="Ask Pako"
      >
        <Sparkles size={15} aria-hidden="true" />
        <span className="ask-pako-label">Ask Pako</span>
        <ChevronDown size={14} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="agent-tools-menu">
        {requests.map(({ label, request }) => (
          <DropdownMenuItem key={label} onClick={() => onAsk(request)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
