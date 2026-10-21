import test from "node:test";
import assert from "node:assert/strict";
import { createAgentService } from "./service.ts";
import { validateRequest } from "./validation.ts";
import { AgentError } from "./errors.ts";

import {
  output,
  completion,
  fakeConfig,
  fakeFetch,
} from "./testing/provider.ts";

// Use explicit fetch mocks below when a test needs to inspect requests or retries.
const serviceWithResponse = (data: unknown) =>
  createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async () => completion(data)),
  });

const rejectsCode = (code: string) => (error: unknown) =>
  error instanceof AgentError && error.code === code;
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";

test("unconfigured provider returns a setup error without fabricated output", async () => {
  let called = false;
  const service = createAgentService({
    ...fakeConfig,
    apiKey: "",
    fetchImpl: fakeFetch(async () => {
      called = true;
      throw new Error("must not call");
    }),
  });
  assert.equal(service.health().mode, "unconfigured");
  await assert.rejects(
    service.assist({ intent: "search", text: "desk" }),
    rejectsCode("AGENT_NOT_CONFIGURED"),
  );
  assert.equal(called, false);
});

test("live requests use official JSON format and keep API keys out of responses", async () => {
  let sent: Record<string, unknown> = {};
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (url, init) => {
      assert.equal(url, "https://mock.invalid/chat/completions");
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        `Bearer ${fakeConfig.apiKey}`,
      );
      sent = JSON.parse(String(init?.body));
      return completion({
        ...output,
        mode: "demo",
        metadata: { ...output.metadata, category: "invented", arbitrary: true },
      });
    }),
  });
  const response = await service.assist({
    intent: "search",
    text: "white desk under CHF 80",
  });
  assert.equal(response.mode, "live");
  assert.equal(response.model, "deepseek-flash");
  assert.deepEqual(sent.thinking, { type: "disabled" });
  assert.deepEqual(sent.response_format, { type: "json_object" });
  assert.match(JSON.stringify(sent.messages), /JSON/);
  assert.equal(sent.model, "deepseek-flash");
  assert.equal("category" in response.metadata, false);
  assert.equal("arbitrary" in response.metadata, false);
  assert.equal(JSON.stringify(response).includes(fakeConfig.apiKey), false);
});

test("only explicitly submitted listing photos become provider image content", async () => {
  let content: unknown;
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (_url, init) => {
      content = JSON.parse(String(init?.body)).messages[1].content;
      return completion({
        suggestions: [],
        missingDetails: [],
        metadata: { title: "Stool", query: "stool", keywords: ["stool"] },
      });
    }),
  });
  await service.assist({ intent: "listing", text: "Stool", image: png });
  assert.ok(Array.isArray(content));
  assert.deepEqual(content[1], {
    type: "image_url",
    image_url: { url: png, detail: "auto" },
  });
  await service.assist({ intent: "search", text: "Stool" });
  assert.equal(typeof content, "string");
  await assert.rejects(
    service.assist({ intent: "search", text: "Stool", image: png }),
    rejectsCode("INVALID_IMAGE"),
  );
});

test("live search metadata cannot erase explicit constraints and suggestions cannot relax them", async () => {
  const service = serviceWithResponse({
    suggestions: [
      "white desk within 5 km",
      "white desk under CHF 80 within 2 km, pickup by 2026-10-16",
      "desk under CHF 80 within 2 km",
    ],
    missingDetails: [],
    metadata: {
      query: "white desk",
      maxPrice: 500,
      radius: 20,
      keywords: ["desk"],
    },
  });
  const result = await service.assist({
    intent: "search",
    text: "white desk under CHF 80 within 2 km",
    context: { pickupBy: "2026-10-16" },
  });
  assert.equal(result.metadata.maxPrice, 80);
  assert.equal(result.metadata.radius, 2);
  assert.equal(result.metadata.pickupBy, "2026-10-16");
  assert.deepEqual(result.suggestions, [
    "white desk under CHF 80 within 2 km, pickup by 2026-10-16",
  ]);
});

test("live constraint-only refinement retains the current item", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: { query: "", keywords: [] },
  });
  const result = await service.assist({
    intent: "search",
    text: "under CHF 100",
    context: { currentQuery: "white desk", radius: 2 },
  });
  assert.equal(result.metadata.query, "white desk");
  assert.equal(result.metadata.maxPrice, 100);
  assert.equal(result.metadata.radius, 2);
});

test("cleared pickup and budget restrictions survive the API and replacement suggestions", async () => {
  const request = {
    intent: "search" as const,
    text: "pickup flexible, any budget",
    context: {
      currentQuery: "white desk",
      maxPrice: 80,
      pickupBy: "2026-10-16",
    },
  };
  for (const apiKey of [fakeConfig.apiKey]) {
    const service = createAgentService({
      ...fakeConfig,
      apiKey,
      fetchImpl: fakeFetch(async () =>
        completion({
          suggestions: [],
          missingDetails: [],
          metadata: { query: "", pickupBy: "", keywords: [] },
        }),
      ),
    });
    const result = await service.assist(request);
    assert.equal(result.metadata.query, "white desk");
    assert.equal(result.metadata.pickupBy, "");
    assert.equal(result.metadata.maxPrice, 1_000_000);
  }
});

test("semantically incomplete live metadata is an explicit error", async () => {
  for (const request of [
    { intent: "search", text: "white desk" },
    { intent: "listing", text: "Coat stand" },
  ]) {
    const service = serviceWithResponse({
      suggestions: [],
      missingDetails: [],
      metadata: { keywords: [] },
    });
    await assert.rejects(
      service.assist(request),
      rejectsCode("INVALID_AGENT_RESPONSE"),
    );
  }
});

test("live listing grounding preserves a stated asking price and rejects negated condition", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: {
      title: "Desk",
      price: 300,
      condition: "Good",
      keywords: ["desk"],
    },
  });
  const result = await service.assist({
    intent: "listing",
    text: "Desk, bought for CHF 300; asking CHF 80. Not in good condition.",
  });
  assert.equal(result.metadata.price, 80);
  assert.equal(result.metadata.condition, null);
});

test("listing facts absent from seller notes are null even if the provider guesses", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: {
      title: "Desk",
      price: 200,
      condition: "Very good",
      dimensions: "100 × 50 cm",
      location: "Paris",
      keywords: ["desk"],
    },
  });
  const response = await service.assist({
    intent: "listing",
    text: "Desk",
    context: { location: "Lausanne" },
  });
  assert.equal(response.metadata.price, null);
  assert.equal(response.metadata.condition, null);
  assert.equal(response.metadata.dimensions, null);
  assert.equal(response.metadata.location, undefined);
  assert.ok(response.missingDetails.includes("Asking price"));
});

test("seller-provided price, condition and dimensions survive grounding", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: {
      title: "Desk",
      price: 65,
      condition: "Good",
      dimensions: "120 x 60 cm",
      location: "Lausanne",
      keywords: ["desk"],
    },
  });
  const response = await service.assist({
    intent: "listing",
    text: "Desk, CHF 65, condition: Good, 120 × 60 cm",
    context: { location: "Lausanne" },
  });
  assert.equal(response.metadata.price, 65);
  assert.equal(response.metadata.condition, "Good");
  assert.equal(response.metadata.dimensions, "120 x 60 cm");
});

test("malformed JSON, invalid shape and truncated provider output are rejected", async () => {
  for (const response of [
    completion("not JSON"),
    completion({ ...output, metadata: { keywords: "desk" } }),
    completion(output, "length"),
    completion({ ...output, metadata: { ...output.metadata, radius: -5 } }),
    completion({ ...output, suggestions: ["x".repeat(161)] }),
  ]) {
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () => response),
    });
    await assert.rejects(
      service.assist({ intent: "search", text: "desk" }),
      rejectsCode("INVALID_AGENT_RESPONSE"),
    );
  }
});

test("provider failures stay explicit errors rather than switching to demo", async () => {
  for (const [status, code] of [
    [401, "PROVIDER_AUTH_ERROR"],
    [429, "PROVIDER_BUSY"],
    [500, "PROVIDER_ERROR"],
  ] as const) {
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(
        async () => new Response("private upstream detail", { status }),
      ),
    });
    await assert.rejects(
      service.assist({ intent: "search", text: "desk" }),
      (error) => {
        assert.ok(rejectsCode(code)(error));
        assert.equal(String(error).includes("private upstream detail"), false);
        return true;
      },
    );
  }
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async () => {
      throw new Error(fakeConfig.apiKey);
    }),
  });
  await assert.rejects(
    service.assist({ intent: "search", text: "desk" }),
    (error) => {
      assert.ok(rejectsCode("PROVIDER_ERROR")(error));
      assert.equal(String(error).includes(fakeConfig.apiKey), false);
      return true;
    },
  );
});

const waitingFetch = fakeFetch(
  async (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("test guard")), 1000);
      init?.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    }),
);

test("provider timeout and caller cancellation have distinct safe errors", async () => {
  const timed = createAgentService({
    ...fakeConfig,
    timeoutMs: 15,
    fetchImpl: waitingFetch,
  });
  await assert.rejects(
    timed.assist({ intent: "search", text: "desk" }),
    rejectsCode("AGENT_TIMEOUT"),
  );
  const controller = new AbortController();
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: waitingFetch,
  });
  const pending = service.assist(
    { intent: "search", text: "desk" },
    controller.signal,
  );
  controller.abort();
  await assert.rejects(pending, rejectsCode("REQUEST_CANCELLED"));
});

test("request validation bounds fields, dates and image formats", () => {
  for (const value of [
    { intent: "search", text: "" },
    { intent: "search", text: "x".repeat(4001) },
    { intent: "other", text: "desk" },
    { intent: "search", text: "desk", context: { radius: -1 } },
    { intent: "search", text: "desk", context: { pickupBy: "2026-02-31" } },
    { intent: "listing", text: "", image: "https://example.com/photo.jpg" },
    { intent: "listing", text: "", image: "data:image/png;base64,dGV4dA==" },
  ]) {
    assert.throws(() => validateRequest(value), AgentError);
  }
  assert.deepEqual(
    validateRequest({
      intent: "search",
      text: " desk ",
      unknown: true,
      context: { radius: 5, private: true },
    }),
    { intent: "search", text: "desk", context: { radius: 5 } },
  );
});

test("an unset pickup deadline keeps valid live refinements and optional keywords", async () => {
  const suggestion = "White desk under CHF 80 within 5 km with drawers";
  const service = serviceWithResponse({
    suggestions: [suggestion],
    missingDetails: [],
    metadata: { query: "White desk", maxPrice: 80, radius: 5 },
  });
  const result = await service.assist({
    intent: "search",
    text: "White desk under CHF 80 within 5 km of Lausanne",
    context: { location: "Lausanne", maxPrice: 500, radius: 10, pickupBy: "" },
  });
  assert.deepEqual(result.suggestions, [suggestion]);
  assert.deepEqual(result.metadata.keywords, []);
});

test("unfinished typing with an explicit empty query and clarification is not an incomplete response", async () => {
  for (const phrase of ["I am looking", "I need", "ich suche", "under CHF"]) {
    const service = serviceWithResponse({
      suggestions: [],
      missingDetails: ["What item are you looking for?"],
      metadata: { query: "", keywords: [] },
    });
    const result = await service.assist({
      intent: "search",
      text: phrase,
      context: { currentQuery: "old wardrobe", maxPrice: 80, radius: 5 },
    });
    assert.equal(result.metadata.query, "", phrase);
    assert.deepEqual(result.missingDetails, ["What item are you looking for?"]);
    assert.equal(result.metadata.maxPrice, 80);
    assert.equal(result.metadata.radius, 5);
  }
});

test("an empty item query without clarification remains a genuine incomplete response", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: { query: "", keywords: [] },
  });
  await assert.rejects(
    service.assist({ intent: "search", text: "white desk" }),
    rejectsCode("INVALID_AGENT_RESPONSE"),
  );
});

test("absent or null optional advice arrays normalize without inventing metadata", async () => {
  for (const advice of [{}, { suggestions: null, missingDetails: null }]) {
    const service = serviceWithResponse({
      ...advice,
      metadata: { query: "chair", keywords: null },
    });
    const result = await service.assist({ intent: "search", text: "chair" });
    assert.deepEqual(result.suggestions, []);
    assert.deepEqual(result.missingDetails, []);
    assert.deepEqual(result.metadata, { query: "chair", keywords: [] });
  }
});

test("a structurally invalid completed search response gets one bounded provider repair", async () => {
  let calls = 0;
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (_url, init) => {
      const sent = JSON.parse(String(init?.body));
      calls++;
      assert.equal(JSON.parse(sent.messages[1].content).text, "desk");
      if (calls === 1)
        return completion({
          suggestions: [],
          missingDetails: [],
          metadata: { query: "desk", radius: "five", keywords: [] },
        });
      assert.match(
        sent.messages[0].content,
        /previous response had an invalid JSON structure/,
      );
      return completion({
        suggestions: [],
        missingDetails: [],
        metadata: { query: "desk", keywords: [] },
      });
    }),
  });
  const result = await service.assist({ intent: "search", text: "desk" });
  assert.equal(calls, 2);
  assert.equal(result.mode, "live");
  assert.equal(result.metadata.query, "desk");
  assert.equal(result.metadata.radius, undefined);
});

test("repair remains bounded and cannot convert truncation or listing failures into success", async () => {
  for (const [intent, finishReason, expectedCalls] of [
    ["search", "stop", 2],
    ["search", "length", 1],
    ["listing", "stop", 1],
  ] as const) {
    let calls = 0;
    const service = createAgentService({
      ...fakeConfig,
      fetchImpl: fakeFetch(async () => {
        calls++;
        return completion("not JSON", finishReason);
      }),
    });
    await assert.rejects(
      service.assist({ intent, text: "desk" }),
      rejectsCode("INVALID_AGENT_RESPONSE"),
    );
    assert.equal(calls, expectedCalls);
  }
});

test("typing cancellation prevents a second provider call after invalid output", async () => {
  let calls = 0;
  const controller = new AbortController();
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async () => {
      calls++;
      controller.abort();
      return completion("not JSON");
    }),
  });
  await assert.rejects(
    service.assist({ intent: "search", text: "desk" }, controller.signal),
    rejectsCode("REQUEST_CANCELLED"),
  );
  assert.equal(calls, 1);
});

test("photo observations provide clickable facts without turning missing fields into questions", async () => {
  let sent: any;
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return completion({
        suggestions: [
          "Two books",
          "Gregs Tagebuch",
          "What condition are they in?",
        ],
        missingDetails: ["Condition"],
        metadata: {
          title: "Two Gregs Tagebuch books",
          description: "Two books with Gregs Tagebuch printed on their covers.",
          keywords: ["books"],
          price: 20,
          condition: "Good",
          dimensions: "20 cm",
        },
      });
    }),
  });
  const result = await service.assist({
    intent: "listing",
    text: "",
    image: png,
  });
  assert.deepEqual(result.suggestions, ["Two books", "Gregs Tagebuch"]);
  assert.equal(result.metadata.title, "Two Gregs Tagebuch books");
  assert.equal(result.metadata.price, null);
  assert.equal(result.metadata.condition, null);
  assert.equal(result.metadata.dimensions, null);
  assert.match(sent.messages[0].content, /Read clearly legible product text/);
  assert.equal(sent.messages[1].content[1].image_url.detail, "auto");
});

test("initial listing normalizes seller condition language without guessing from the photo", async () => {
  for (const [text, expected] of [
    ["Two books, sehr guter Zustand", "Very good"],
    ["Books in guter Zustand", "Good"],
    ["Livre en très bon état", "Very good"],
    ["Livre en bon état", "Good"],
    ["Books gebraucht", "Used"],
    ["Book like new", "Very good"],
    ["Book not in good condition", null],
    ["Books, photo attached", null],
  ] as const) {
    const service = serviceWithResponse({
      suggestions: [],
      missingDetails: ["Condition", "Dimensions"],
      metadata: {
        title: "Two books",
        description: "Two visible books.",
        condition: "Good",
        keywords: ["books"],
      },
    });
    const result = await service.assist({
      intent: "listing",
      text,
      image: png,
    });
    assert.equal(result.metadata.condition, expected, text);
    assert.equal(result.metadata.title, "Two books");
    assert.equal(result.metadata.description, "Two visible books.");
    assert.ok(!result.missingDetails.includes("Dimensions"));
    if (expected) assert.ok(!result.missingDetails.includes("Condition"));
  }
});

test("measurements are optional rather than universally added as a missing listing fact", async () => {
  const service = serviceWithResponse({
    suggestions: [],
    missingDetails: [],
    metadata: { title: "Lamp", keywords: ["lamp"] },
  });
  const result = await service.assist({ intent: "listing", text: "Lamp" });
  assert.equal(result.metadata.dimensions, null);
  assert.ok(!result.missingDetails.includes("Dimensions"));
});

test("initial listing retains exact seller-grounded custom condition and natural used wording", async () => {
  for (const [notes, condition, expected] of [
    ["Used bicycle with wear", "Used", "Used"],
    ["Condition: fair", "Fair", "Fair"],
    ["Bicycle, not in fair condition", "Fair", null],
    ["Bicycle is not used", "Used", null],
    ["Unused bicycle", "Used", null],
    ["Bicycle with wear", "Fair", null],
  ] as const) {
    const service = serviceWithResponse({
      suggestions: [],
      missingDetails: [],
      metadata: { title: "Bicycle", condition, keywords: ["bicycle"] },
    });
    const result = await service.assist({ intent: "listing", text: notes });
    // Explicit 'unused' is a New condition, never a substring match for Used.
    assert.equal(
      result.metadata.condition,
      notes === "Unused bicycle" ? "New" : expected,
      notes,
    );
  }
});

test("all listing photos reach the model in order, with a single cover copy", async () => {
  const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0x01]).toString("base64")}`;
  let content: any;
  const service = createAgentService({
    ...fakeConfig,
    fetchImpl: fakeFetch(async (_url, init) => {
      content = JSON.parse(String(init?.body)).messages[1].content;
      return completion({
        suggestions: [],
        missingDetails: [],
        metadata: { title: "Desk", keywords: ["desk"] },
      });
    }),
  });
  await service.assist({
    intent: "listing",
    text: "",
    image: png,
    images: [png, jpeg],
  });
  assert.deepEqual(
    content.slice(1).map((part: any) => part.image_url.url),
    [png, jpeg],
  );
  await service.assist({ intent: "listing", text: "", images: [jpeg, png] });
  assert.deepEqual(
    content.slice(1).map((part: any) => part.image_url.url),
    [jpeg, png],
  );
  for (const request of [
    { intent: "search", text: "desk", images: [png] },
    { intent: "listing", text: "", images: Array(7).fill(png) },
    {
      intent: "listing",
      text: "",
      images: [png, "https://example.com/image.jpg"],
    },
  ])
    await assert.rejects(service.assist(request), rejectsCode("INVALID_IMAGE"));
});

test("gallery validation rejects excessive total photo bytes", () => {
  const photo = (suffix: number) => {
    const bytes = Buffer.alloc(1200 * 1024, suffix);
    bytes.set([0xff, 0xd8, 0xff]);
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  };
  assert.throws(
    () =>
      validateRequest({
        intent: "listing",
        text: "",
        images: [photo(1), photo(2)],
      }),
    rejectsCode("INVALID_IMAGE"),
  );
});

test("typing suggestions may omit background filters while metadata retains them", async () => {
  const service = serviceWithResponse({
    suggestions: ["used book", "paperback book"],
    missingDetails: ["What genre or language would you like?"],
    metadata: { query: "book", keywords: ["book"] },
  });
  const result = await service.assist({
    intent: "search",
    text: "i want a book",
    context: { maxPrice: 500, radius: 20, location: "Lausanne" },
  });
  assert.deepEqual(result.suggestions, ["used book", "paperback book"]);
  assert.equal(result.metadata.maxPrice, 500);
  assert.equal(result.metadata.radius, 20);
});
