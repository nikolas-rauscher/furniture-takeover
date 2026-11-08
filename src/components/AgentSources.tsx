import type { AgentRunSource } from "../../shared/runs";
import { useState } from "react";
import { safeSourceUrl } from "../api/runs";
import { Globe, ArrowUpRight } from "./icons";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
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

export default function AgentSources({
  sources,
  previews = false,
}: {
  sources: readonly AgentRunSource[];
  previews?: boolean;
}) {
  const seen = new Set<string>();
  const unique = sources.filter((source) => {
    const url = safeSourceUrl(source.url);
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  if (!unique.length) return null;
  const extra = previews ? unique.slice(3) : unique;
  return (
    <div className={`agent-sources${previews ? " has-previews" : ""}`}>
      {previews && (
        <ul className="agent-source-previews" aria-label="Web sources">
          {unique.slice(0, 3).map((source) => (
            <li key={source.url}>
              <SourcePreview source={source} />
            </li>
          ))}
        </ul>
      )}
      {extra.length > 0 && (
        <Trace>
          <TraceCollapsible>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <Globe />
                </TraceIcon>
                <TraceTitle>
                  {previews ? "More sources" : "Sources"} ({extra.length})
                </TraceTitle>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              <Trace className="agent-source-list">
                {extra.map((source) => {
                  const url = safeSourceUrl(source.url)!;
                  const title =
                    source.title?.trim() ||
                    new URL(url).hostname.replace(/^www\./, "");
                  return (
                    <a
                      className="agent-source-link"
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <TraceLine>
                        <TraceIcon>
                          <Globe />
                        </TraceIcon>
                        <TraceTitle>
                          {title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </TraceTitle>
                        <TraceIcon>
                          <ArrowUpRight />
                        </TraceIcon>
                      </TraceLine>
                    </a>
                  );
                })}
              </Trace>
            </TraceCollapsibleContent>
          </TraceCollapsible>
        </Trace>
      )}
    </div>
  );
}
