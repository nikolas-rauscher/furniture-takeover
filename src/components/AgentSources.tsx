import type { AgentRunSource } from "../../shared/runs";
import { useState } from "react";
import { safeSourceUrl } from "../api/runs";
import { Globe, ArrowUpRight } from "./icons";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "./ui/trace";
import "./ai-elements.css";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "./ui/item";

function SourcePreview({ source }: { source: AgentRunSource }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = safeSourceUrl(source.url)!;
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const imageUrl = source.imageUrl && safeSourceUrl(source.imageUrl);
  // Only load the provider's image proxy, never an arbitrary snippet URL.
  const showImage =
    imageUrl &&
    new URL(imageUrl).hostname === "imgs.search.brave.com" &&
    !imageFailed;
  return (
    <Item
      className="agent-source-preview"
      variant="outline"
      size="xs"
      render={<a href={url} target="_blank" rel="noreferrer noopener" />}
    >
      {showImage && (
        <ItemMedia className="agent-source-thumbnail">
          <Globe size={18} aria-hidden="true" />
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        </ItemMedia>
      )}
      <ItemContent>
        <span className="agent-source-domain">{hostname}</span>
        <ItemTitle>{source.title?.trim() || hostname}</ItemTitle>
        {source.snippet && <ItemDescription>{source.snippet}</ItemDescription>}
        <span className="sr-only"> (opens in a new tab)</span>
      </ItemContent>
      <ArrowUpRight size={14} aria-hidden="true" />
    </Item>
  );
}

/**
 * Sources stay out of the way: one line names how many there are and where they
 * come from; opening it shows each with its title and snippet. Citations in the
 * answer link to the same pages directly.
 */
export default function AgentSources({
  sources,
}: {
  sources: readonly AgentRunSource[];
}) {
  const seen = new Set<string>();
  const unique = sources.filter((source) => {
    const url = safeSourceUrl(source.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  if (!unique.length) return null;
  const domains = [
    ...new Set(
      unique.map((source) =>
        new URL(safeSourceUrl(source.url)!).hostname.replace(/^www\./, ""),
      ),
    ),
  ];
  return (
    <Trace className="agent-sources">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <Globe />
            </TraceIcon>
            <TraceTitle>
              {unique.length} {unique.length === 1 ? "source" : "sources"}
            </TraceTitle>
            <TraceDescription className="agent-source-domains">
              {domains.join(", ")}
            </TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <ul className="agent-source-previews" aria-label="Sources">
            {unique.map((source) => (
              <li key={source.url}>
                <SourcePreview source={source} />
              </li>
            ))}
          </ul>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
