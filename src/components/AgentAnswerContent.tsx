import { useState, type ReactNode } from "react";
import type { AgentRunSource } from "../../shared/runs";
import { safeSourceUrl } from "../api/runs";
import { parseAnswerBlocks, parseAnswerInline } from "./agentAnswer";

export function SourceThumbnail({ imageUrl }: { imageUrl: string }) {
  const [failed, setFailed] = useState(false);
  const url = safeSourceUrl(imageUrl);
  if (failed || !url) return null;
  return (
    <img
      className="agent-run-source-image"
      src={url}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export function answerParts(
  text: string,
  sources: AgentRunSource[],
  streaming = false,
): ReactNode[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  return parseAnswerInline(text).map((part, index) => {
    const source = part.kind === "citation" && byId.get(part.text);
    const url = source ? safeSourceUrl(source.url) : null;
    if (source && url)
      return (
        <a
          key={index}
          className="agent-run-citation"
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Source: ${source.title}`}
          title={source.title}
        >
          [{part.text.replace(/^web-/, "")}]
        </a>
      );
    if (part.kind === "bold")
      return (
        <strong key={index}>
          {answerParts(part.text, sources, streaming)}
        </strong>
      );
    if (part.kind === "emphasis")
      return <em key={index}>{answerParts(part.text, sources, streaming)}</em>;
    if (part.kind === "citation") return `[${part.text}]`;
    return part.text.split(/(\s+)/).map((word, wordIndex) =>
      /^\s*$/.test(word) ? (
        word
      ) : (
        <span
          key={`${index}-${wordIndex}`}
          className={streaming ? "stream-word" : undefined}
        >
          {word}
        </span>
      ),
    );
  });
}

export function answerBlocks(
  text: string,
  sources: AgentRunSource[],
  streaming = false,
): ReactNode[] {
  return parseAnswerBlocks(text).map((block) => {
    if (block.kind === "heading") {
      const Heading = block.level <= 2 ? "h3" : "h4";
      return (
        <Heading key={block.key}>
          {answerParts(block.text, sources, streaming)}
        </Heading>
      );
    }
    if (block.kind === "list") {
      const items = block.items.map((item) => (
        <li key={item.key}>{answerParts(item.text, sources, streaming)}</li>
      ));
      return block.ordered ? (
        <ol key={block.key} start={block.start}>
          {items}
        </ol>
      ) : (
        <ul key={block.key}>{items}</ul>
      );
    }
    return <p key={block.key}>{answerParts(block.text, sources, streaming)}</p>;
  });
}
