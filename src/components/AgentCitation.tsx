import type { AgentRunSource } from "../../shared/runs";
import { safeSourceUrl } from "../api/runs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

export default function AgentCitation({
  source,
  label,
}: {
  source: AgentRunSource;
  label: string;
}) {
  const url = safeSourceUrl(source.url);
  if (!url) return null;
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const title = source.title?.trim() || hostname;
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={200}
        closeDelay={150}
        className="agent-run-citation"
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`Source: ${title} (opens in a new tab)`}
      >
        [{label}]
      </HoverCardTrigger>
      <HoverCardContent className="agent-citation-preview" align="start">
        <strong>{title}</strong>
        <span>{hostname}</span>
        {source.snippet && <p>{source.snippet}</p>}
        <a href={url} target="_blank" rel="noreferrer noopener">
          Open source<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </HoverCardContent>
    </HoverCard>
  );
}
