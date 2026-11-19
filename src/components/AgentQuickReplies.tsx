import { useId, type CSSProperties } from "react";
import {
  usesAllowance,
  type QuickReplies,
  type QuickReply,
} from "../quickReplies";
import { focusConversation } from "./AgentConversation";
import { Suggestion, Suggestions } from "./ui/suggestion";
import "./agent-quick-replies.css";

/** Chips rise one after another; from the fourth on they arrive together. */
const LAST_STAGGER_STEP = 3;

/** Pako's suggestions for the student's next message, under his latest answer. */
export default function AgentQuickReplies({
  line,
  replies,
  pausedReason,
  onSelect,
}: QuickReplies & {
  /** Why replies that ask Pako cannot be sent right now, such as a used-up daily allowance. */
  pausedReason?: string;
  onSelect: (reply: QuickReply) => void;
}) {
  const reasonId = useId();
  return (
    <div className="agent-quick-replies">
      {line && <p className="agent-quick-replies-line">{line}</p>}
      <Suggestions
        className="agent-quick-reply-list"
        aria-label="Quick replies"
      >
        {replies.map((reply, index) => {
          const paused = pausedReason !== undefined && usesAllowance(reply);
          return (
            <Suggestion
              key={reply.text}
              className="agent-quick-reply"
              disabled={paused}
              focusableWhenDisabled={paused}
              aria-describedby={paused ? reasonId : undefined}
              style={
                {
                  "--stagger": Math.min(index, LAST_STAGGER_STEP),
                } as CSSProperties
              }
              onClick={(event) => {
                // The chips leave once the reply is sent; the comparison opens its own page.
                if (reply.kind !== "compare")
                  focusConversation(event.currentTarget);
                onSelect(reply);
              }}
            >
              {reply.text}
            </Suggestion>
          );
        })}
      </Suggestions>
      {pausedReason && (
        <p id={reasonId} className="agent-quick-replies-note">
          {pausedReason}
        </p>
      )}
    </div>
  );
}
