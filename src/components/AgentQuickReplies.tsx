import { useId, type CSSProperties } from "react";
import { motion } from "motion/react";
import {
  usesAllowance,
  type QuickReplies,
  type QuickReply,
  type TappableReply,
} from "../quickReplies";
import { focusConversation } from "./AgentConversation";
import { Bell, Check } from "@/components/icons";
import { Suggestion, Suggestions } from "./ui/suggestion";
import "./agent-quick-replies.css";

/** Chips rise one after another; from the fourth on they arrive together. */
const LAST_STAGGER_STEP = 3;
/** A tapped watch turns into its confirmation with the redesign's chip spring. */
const CONFIRM = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Acting on what Pako found comes first; replies that change the search follow on their own row. */
const isRefinement = (reply: QuickReply) => reply.kind === "ask";

/** Pako's suggestions for the student's next message, under his latest answer. */
export default function AgentQuickReplies({
  line,
  replies,
  pausedReason,
  onSelect,
}: QuickReplies & {
  /** Why replies that ask Pako cannot be sent right now, such as a used-up daily allowance. */
  pausedReason?: string;
  onSelect: (reply: TappableReply) => void;
}) {
  const reasonId = useId();
  const actions = replies.filter((reply) => !isRefinement(reply));
  const refinements = replies.filter(isRefinement);
  const chip = (reply: QuickReply, index: number) => {
    if (reply.kind === "watching")
      return (
        <motion.span
          key={reply.kind}
          className="chip agent-quick-reply-done"
          role="status"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={CONFIRM}
        >
          <Check size={15} aria-hidden="true" />
          {reply.text}
        </motion.span>
      );
    const paused = pausedReason !== undefined && usesAllowance(reply);
    return (
      <Suggestion
        key={reply.text}
        className="agent-quick-reply"
        data-kind={reply.kind}
        disabled={paused}
        focusableWhenDisabled={paused}
        aria-describedby={paused ? reasonId : undefined}
        style={
          {
            "--stagger": Math.min(index, LAST_STAGGER_STEP),
          } as CSSProperties
        }
        onClick={(event) => {
          // A sent reply takes the chips away and a watch turns into its
          // confirmation, so focus moves on; a comparison and Searches open their own page.
          if (reply.kind !== "compare" && reply.kind !== "searches")
            focusConversation(event.currentTarget);
          onSelect(reply);
        }}
      >
        {reply.kind === "watch" && <Bell size={15} aria-hidden="true" />}
        {reply.text}
      </Suggestion>
    );
  };
  return (
    <div className="agent-quick-replies">
      {line && <p className="agent-quick-replies-line">{line}</p>}
      {actions.length > 0 && (
        <Suggestions className="agent-quick-reply-list" aria-label="Next steps">
          {actions.map(chip)}
        </Suggestions>
      )}
      {refinements.length > 0 && (
        <Suggestions
          className="agent-quick-reply-list"
          aria-label="Change the search"
        >
          {refinements.map((reply, index) =>
            chip(reply, actions.length + index),
          )}
        </Suggestions>
      )}
      {pausedReason && (
        <p id={reasonId} className="agent-quick-replies-note">
          {pausedReason}
        </p>
      )}
    </div>
  );
}
