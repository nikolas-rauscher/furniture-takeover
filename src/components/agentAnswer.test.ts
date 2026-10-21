import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAnswerBlocks,
  parseAnswerInline,
  splitSearchAnswer,
} from "./agentAnswer.ts";

test("platform and web comparisons remain in separate messages", () => {
  assert.deepEqual(
    splitSearchAnswer(
      "## Takeover\nThe city bike is CHF 45.\n\n## Web search\nThe snippet lists another bike [web-1].",
      true,
    ),
    {
      takeover: "The city bike is CHF 45.",
      web: "The snippet lists another bike [web-1].",
    },
  );
  assert.deepEqual(
    splitSearchAnswer(
      "## Takeover\nNo platform matches.\n\n## Web search\nNo suitable external offers.",
      false,
    ),
    {
      takeover: "No platform matches.",
      web: "No suitable external offers.",
    },
  );
});

test("a platform-only answer does not manufacture a web message", () => {
  assert.deepEqual(
    splitSearchAnswer("## Takeover\nThe desk is CHF 40.", false),
    { takeover: "The desk is CHF 40.", web: "" },
  );
  assert.deepEqual(splitSearchAnswer("The desk is CHF 40.", false), {
    takeover: "The desk is CHF 40.",
    web: "",
  });
});

test("legacy external answers do not get attributed to platform inventory", () => {
  assert.deepEqual(
    splitSearchAnswer("A bike in the search results [web-1].", true),
    { takeover: "", web: "A bike in the search results [web-1]." },
  );
});

test("answers become paragraphs, headings and real list blocks", () => {
  const blocks = parseAnswerBlocks(
    "A short introduction.\n\n## Good options\n- First chair\n  with a cushion\n- Second chair\n\n1. Check the price\n2. Contact the seller",
  );
  assert.deepEqual(
    blocks.map((block) => block.kind),
    ["paragraph", "heading", "list", "list"],
  );
  assert.equal(blocks[2].kind, "list");
  if (blocks[2].kind === "list")
    assert.deepEqual(
      blocks[2].items.map((item) => item.text),
      ["First chair with a cushion", "Second chair"],
    );
  assert.equal(blocks[3].kind === "list" && blocks[3].ordered, true);
});

test("complete emphasis and citations are parsed while HTML stays escaped text content", () => {
  assert.deepEqual(
    parseAnswerInline('A **chair**, *nearby* [web-1] <img onerror="alert(1)">'),
    [
      { kind: "text", text: "A " },
      { kind: "bold", text: "chair" },
      { kind: "text", text: ", " },
      { kind: "emphasis", text: "nearby" },
      { kind: "text", text: " " },
      { kind: "citation", text: "web-1" },
      { kind: "text", text: ' <img onerror="alert(1)">' },
    ],
  );
});

test("appending stream text preserves earlier block keys and incomplete emphasis is literal", () => {
  const first = parseAnswerBlocks("A paragraph.\n\n- One\n- Tw");
  const next = parseAnswerBlocks("A paragraph.\n\n- One\n- Two\n\n## More");
  assert.equal(first[0].key, next[0].key);
  assert.equal(first[1].key, next[1].key);
  assert.deepEqual(parseAnswerInline("An *unfinished phrase"), [
    { kind: "text", text: "An *unfinished phrase" },
  ]);
});
