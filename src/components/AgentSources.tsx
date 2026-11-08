import type { AgentRunSource } from "../../shared/runs";
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
  return (
    <Trace className="agent-sources">
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <Globe />
            </TraceIcon>
            <TraceTitle>
              Used {unique.length} {unique.length === 1 ? "source" : "sources"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace className="agent-source-list">
            {unique.map((source) => {
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
  );
}
