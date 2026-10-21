/** Explicit answer sections keep platform recommendations separate from web evidence. */
export function splitSearchAnswer(text: string, hasWebSources: boolean) {
  const sections = { takeover: "", web: "" };
  const heading = /^\s*#{1,3}\s+(Takeover|Web search)\s*$/gim;
  const matches = [...text.matchAll(heading)];
  if (!matches.length) {
    sections[hasWebSources ? "web" : "takeover"] = text.trim();
    return sections;
  }
  const prefix = text.slice(0, matches[0].index).trim();
  if (prefix) sections[hasWebSources ? "web" : "takeover"] = prefix;
  matches.forEach((match, index) => {
    const key = match[1].toLowerCase() === "takeover" ? "takeover" : "web";
    const content = text
      .slice(
        match.index! + match[0].length,
        matches[index + 1]?.index ?? text.length,
      )
      .trim();
    sections[key] = [sections[key], content].filter(Boolean).join("\n\n");
  });
  return sections;
}

export type AnswerBlock =
  | { kind: "paragraph"; key: number; text: string }
  | { kind: "heading"; key: number; level: number; text: string }
  | {
      kind: "list";
      key: number;
      ordered: boolean;
      start: number;
      items: { key: number; text: string }[];
    };

export type AnswerInline = {
  kind: "text" | "bold" | "emphasis" | "citation";
  text: string;
};

/** Small, deliberately limited Markdown subset. All content stays plain text. */
export function parseAnswerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  let current: AnswerBlock | null = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line, key) => {
      if (!line.trim()) {
        flush();
        return;
      }
      const heading = /^\s{0,3}(#{1,6})\s+(.+)$/.exec(line);
      if (heading) {
        flush();
        blocks.push({
          kind: "heading",
          key,
          level: heading[1].length,
          text: heading[2].replace(/\s+#+\s*$/, ""),
        });
        return;
      }
      const list = /^\s{0,3}(?:([-+*])|(\d{1,4})[.)])\s+(.*)$/.exec(line);
      if (list) {
        const ordered = Boolean(list[2]);
        if (current?.kind !== "list" || current.ordered !== ordered) {
          flush();
          current = {
            kind: "list",
            key,
            ordered,
            start: ordered ? Number(list[2]) : 1,
            items: [],
          };
        }
        current.items.push({ key, text: list[3] });
        return;
      }
      if (current?.kind === "list") {
        const item = current.items[current.items.length - 1];
        item.text += ` ${line.trim()}`;
      } else if (current?.kind === "paragraph") {
        current.text += ` ${line.trim()}`;
      } else {
        current = { kind: "paragraph", key, text: line.trim() };
      }
    });
  flush();
  return blocks;
}

export function parseAnswerInline(text: string): AnswerInline[] {
  return text
    .split(/(\[web-\d+\]|\*\*[^*\n]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*))/g)
    .filter(Boolean)
    .map((part) => {
      if (/^\[web-\d+\]$/.test(part))
        return { kind: "citation", text: part.slice(1, -1) };
      if (part.startsWith("**") && part.endsWith("**"))
        return { kind: "bold", text: part.slice(2, -2) };
      if (part.startsWith("*") && part.endsWith("*"))
        return { kind: "emphasis", text: part.slice(1, -1) };
      return { kind: "text", text: part };
    });
}
