import { ArrowRight } from "lucide-react";
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
};

export default function AgentComposer({
  value,
  onChange,
  onSend,
  label,
  placeholder,
  sendLabel,
  disabled = false,
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
      className="assistant-composer conversation-composer"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        ref={textarea}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        maxLength={4000}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div>
        <button
          type="submit"
          aria-label={sendLabel}
          disabled={disabled || !value.trim()}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
