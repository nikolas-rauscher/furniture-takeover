import { ArrowRight } from "lucide-react";
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
