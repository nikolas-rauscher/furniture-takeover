import { useId, type CSSProperties } from "react";
import SmoothHeight from "./SmoothHeight";
import type { AgentAssistState } from "../hooks/useAgentAssist";
import "./agent-suggestions.css";

type AgentSuggestionsProps = {
  state: AgentAssistState;
  onSelect: (suggestion: string) => void;
  showMissingDetails?: boolean;
};

function SuggestionContent({
  state,
  onSelect,
  showMissingDetails = true,
}: AgentSuggestionsProps) {
  const labelId = useId();
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div
        className="agent-suggestions agent-suggestions-pending"
        role="status"
      >
        Thinking about the details…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="agent-suggestions agent-suggestions-error">
        <p role="status">{state.error}</p>
        <button type="button" onClick={state.retry}>
          Try again
        </button>
      </div>
    );
  }

  const suggestions = [
    ...new Set(
      state.response?.suggestions.map((item) => item.trim()).filter(Boolean),
    ),
  ].slice(0, 3);
  const missingDetails =
    showMissingDetails && !state.response?.metadata.title
      ? (state.response?.missingDetails.filter(Boolean).slice(0, 2) ?? [])
      : [];
  if (!suggestions.length && !missingDetails.length) return null;

  return (
    <section className="agent-suggestions" aria-labelledby={labelId}>
      <div className="agent-suggestions-heading">
        <span id={labelId}>
          {state.response?.metadata.title ? "Add a detail" : "Suggestions"}
        </span>
      </div>
      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              style={
                { "--suggestion-delay": `${index * 60}ms` } as CSSProperties
              }
            >
              <button type="button" onClick={() => onSelect(suggestion)}>
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
      {missingDetails.length > 0 && (
        <p className="agent-suggestions-detail">{missingDetails.join(" ")}</p>
      )}
    </section>
  );
}

/** Keep one height container mounted through idle, loading and result updates. */
export default function AgentSuggestions(props: AgentSuggestionsProps) {
  return (
    <SmoothHeight duration={440}>
      <SuggestionContent {...props} />
    </SmoothHeight>
  );
}
