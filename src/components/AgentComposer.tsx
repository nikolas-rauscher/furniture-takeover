import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "./ui/input-group";
import { ArrowRight, Square } from "@/components/icons";
import { useLayoutEffect, useRef } from "react";
import { fitTextarea } from "../textarea";
import "./agent-composer.css";

type AgentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  label: string;
  placeholder: string;
  sendLabel: string;
  disabled?: boolean;
  onStop?: () => void;
};

export default function AgentComposer({
  value,
  onChange,
  onSend,
  label,
  placeholder,
  sendLabel,
  disabled = false,
  onStop,
}: AgentComposerProps) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (textarea.current) fitTextarea(textarea.current, 100);
  }, [value, placeholder]);
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element?.parentElement) return;
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - width) < 1) return;
      width = entry.contentRect.width;
      fitTextarea(element, 100);
    });
    observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, []);
  const send = () => {
    if (!disabled && value.trim()) onSend();
  };
  return (
    <form
      className="agent-prompt-form"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <InputGroup className="assistant-composer conversation-composer">
        <InputGroupTextarea
          ref={textarea}
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled && !onStop}
          enterKeyHint={onStop ? "enter" : "send"}
          rows={1}
          maxLength={4000}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !onStop &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            key={onStop ? "stop" : "send"}
            animateIcon
            size="icon-sm"
            variant="plain"
            type={onStop ? "button" : "submit"}
            aria-label={onStop ? "Stop agent" : sendLabel}
            title={onStop ? "Stop agent" : sendLabel}
            disabled={!onStop && (disabled || !value.trim())}
            onClick={
              onStop
                ? (event) => {
                    event.preventDefault();
                    onStop();
                    textarea.current?.focus({ preventScroll: true });
                  }
                : undefined
            }
          >
            {onStop ? (
              <Square size={14} fill="currentColor" aria-hidden="true" />
            ) : (
              <ArrowRight size={18} aria-hidden="true" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
