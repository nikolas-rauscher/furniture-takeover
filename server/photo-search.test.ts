import test from "node:test";
import assert from "node:assert/strict";
import { createAgentService } from "./service.ts";
import { completion, fakeConfig, fakeFetch } from "./testing/provider.ts";

test("photo search supports everyday marketplace items without inventing specifics", async () => {
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (_url, init) => {
      const instruction = JSON.parse(String(init?.body)).messages[0].content;
      assert.match(
        instruction,
        /electronics \(such as laptops\), books, bicycles/,
      );
      assert.match(
        instruction,
        /Do not name a brand, model or designer from visual resemblance alone/,
      );
      assert.match(
        instruction,
        /Do not infer specifications, condition or price from the photo/,
      );
      assert.match(instruction, /If no searchable item can be identified/);
      assert.doesNotMatch(
        instruction,
        /If no furniture or home item is visible/,
      );
      return completion({
        suggestions: [],
        missingDetails: [],
        metadata: { query: "silver laptop", keywords: ["laptop"] },
      });
    }),
  });
  const result = await service.assist({
    intent: "search",
    text: "",
    images: [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    ],
  });
  assert.equal(result.metadata.query, "silver laptop");
  assert.equal(result.metadata.price, undefined);
});
