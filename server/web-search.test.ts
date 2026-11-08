import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { searchWeb, validSourceUrl, WebSearchError } from "./web-search.ts";

test("Brave search uses only its fixed endpoint and returns actual safe snippets", async () => {
  let requestUrl = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    assert.equal(new URL(requestUrl).origin, "https://api.search.brave.com");
    assert.equal(new URL(requestUrl).pathname, "/res/v1/web/search");
    assert.equal(
      new URL(requestUrl).searchParams.get("q"),
      "desk Lausanne CHF 80",
    );
    assert.equal(
      (init?.headers as Record<string, string>)["X-Subscription-Token"],
      "search-test-key",
    );
    assert.equal(init?.redirect, "error");
    return Response.json({
      web: {
        results: [
          {
            title: "<strong>Oak desk</strong>",
            url: "https://example.com/desk#details",
            description:
              "Collection in <b>Lausanne</b> &amp; nearby. Bureau d&#x27;occasion &mdash; &eacute;tat &#233;valu&eacute;&#8230;&nbsp;&#x1F4CD;",
          },
          {
            title: "Duplicate",
            url: "https://example.com/desk",
            description: "Same page",
          },
          {
            title: "Unsafe",
            url: "javascript:alert(1)",
            description: "Ignore this",
          },
          {
            title: "Credentials",
            url: "https://user:secret@example.com/item",
            description: "Ignore this",
          },
          {
            title: "No price in source",
            url: "https://example.org/furniture",
            description: "Browse furniture.",
          },
        ],
      },
    });
  };
  const results = await searchWeb("desk Lausanne CHF 80", {
    apiKey: "search-test-key",
    scope: "research",
    fetchImpl,
  });
  assert.deepEqual(results, [
    {
      title: "Oak desk",
      url: "https://example.com/desk",
      snippet:
        "Collection in Lausanne & nearby. Bureau d'occasion — état évalué… 📍",
    },
    {
      title: "No price in source",
      url: "https://example.org/furniture",
      snippet: "Browse furniture.",
    },
  ]);
  assert.equal(JSON.stringify(results).includes("search-test-key"), false);
  assert.equal("price" in results[0], false);
});

test("search previews stay attached to their exact result and unsafe or absent images stay absent", async () => {
  const thumbnails = [
    {
      src: "https://imgs.search.brave.com/desk.jpg",
      original: "https://seller.example/desk.jpg",
    },
    undefined,
    null,
    { src: "javascript:alert(1)" },
    { src: "https://name:secret@example.com/image" },
    { original: "https://seller.example/unreturned-preview.jpg" },
    "https://example.com/not-an-object.jpg",
  ];
  const results = await searchWeb("desks", {
    apiKey: "preview-test-key",
    scope: "research",
    fetchImpl: async () =>
      Response.json({
        web: {
          results: thumbnails.slice(0, 5).map((thumbnail, i) => ({
            title: `Desk ${i}`,
            url: `https://seller.example/item/${i}`,
            description: "Actual offer",
            thumbnail,
          })),
        },
      }),
  });
  assert.equal(results[0].imageUrl, "https://imgs.search.brave.com/desk.jpg");
  for (const result of results.slice(1))
    assert.equal("imageUrl" in result, false);
  const missing = await searchWeb("desk", {
    apiKey: "missing-preview-test-key",
    scope: "research",
    fetchImpl: async () =>
      Response.json({
        web: {
          results: thumbnails.slice(5).map((thumbnail, i) => ({
            title: `Desk ${i}`,
            url: `https://seller.example/no-preview/${i}`,
            thumbnail,
          })),
        },
      }),
  });
  assert.ok(missing.every((result) => !("imageUrl" in result)));
});

test("search URL validation rejects non-HTTPS and credential-bearing links", () => {
  for (const value of [
    "http://example.com",
    "https://name:password@example.com",
    "javascript:alert(1)",
    "not-a-url",
    undefined,
  ])
    assert.equal(validSourceUrl(value), null);
  assert.equal(
    validSourceUrl("https://example.com/path#fragment"),
    "https://example.com/path",
  );
});

test("web search failures stay explicit and never expose provider details", async () => {
  await assert.rejects(
    searchWeb("desk", { apiKey: "" }),
    (error) =>
      error instanceof WebSearchError &&
      error.code === "WEB_SEARCH_NOT_CONFIGURED",
  );
  await assert.rejects(
    searchWeb("desk", {
      apiKey: "failure-key",
      fetchImpl: async () => new Response("upstream secret", { status: 429 }),
    }),
    (error) =>
      error instanceof WebSearchError &&
      error.code === "WEB_SEARCH_BUSY" &&
      !error.message.includes("upstream secret"),
  );
  await assert.rejects(
    searchWeb("desk", {
      apiKey: "failure-key",
      fetchImpl: async () => Response.json({ web: { results: "malformed" } }),
    }),
    (error) =>
      error instanceof WebSearchError &&
      error.code === "WEB_SEARCH_INVALID_RESPONSE",
  );
});

test("no results stay empty and cancellation aborts the actual search fetch", async () => {
  assert.deepEqual(
    await searchWeb("unusual furniture", {
      apiKey: "empty-results-key",
      fetchImpl: async () => Response.json({ web: { results: [] } }),
    }),
    [],
  );
  const controller = new AbortController();
  let upstreamSignal: AbortSignal | null | undefined;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const pending = searchWeb(
    "desk",
    {
      apiKey: "actual-cancellation-key",
      fetchImpl: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          upstreamSignal = init?.signal;
          entered();
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          );
        }),
    },
    controller.signal,
  );
  await started;
  controller.abort();
  await assert.rejects(
    pending,
    (error) =>
      error instanceof WebSearchError && error.code === "REQUEST_CANCELLED",
  );
  assert.equal(upstreamSignal?.aborted, true);
});

test("concurrent Brave requests pace their starts without serializing slow responses", async () => {
  const starts: number[] = [];
  let active = 0;
  let maximumActive = 0;
  const fetchImpl: typeof fetch = async () => {
    starts.push(performance.now());
    active++;
    maximumActive = Math.max(active, maximumActive);
    // Brave's limit applies to arrivals, not the duration of a response.
    if (starts.length === 1) await delay(1_150);
    active--;
    return Response.json({ web: { results: [] } });
  };
  await Promise.all(
    ["desk", "chair", "lamp"].map((query) =>
      searchWeb(query, { apiKey: "shared-throttle-key", fetchImpl }),
    ),
  );
  assert.equal(maximumActive, 2);
  assert.equal(starts.length, 3);
  assert.ok(starts[1] - starts[0] >= 1_100);
  assert.ok(starts[2] - starts[1] >= 1_100);
});

test("waiting for another tester does not consume the fetch timeout", async () => {
  let calls = 0;
  const config = {
    apiKey: "separate-queue-budget-key",
    timeoutMs: 100,
    fetchImpl: (async () => {
      calls++;
      return Response.json({ web: { results: [] } });
    }) as typeof fetch,
  };
  await searchWeb("desk", config);
  assert.deepEqual(await searchWeb("chair", config), []);
  assert.equal(calls, 2);
});

test("transient limits retry once after the provider reset and share the cooldown", async () => {
  const starts: number[] = [];
  const config = {
    apiKey: "provider-reset-key",
    fetchImpl: (async () => {
      starts.push(performance.now());
      return starts.length === 1
        ? new Response("private upstream details", {
            status: 429,
            headers: {
              "X-RateLimit-Remaining": "0, 100",
              "X-RateLimit-Reset": "2, 2592000",
            },
          })
        : Response.json({ web: { results: [] } });
    }) as typeof fetch,
  };
  await Promise.all([searchWeb("desk", config), searchWeb("chair", config)]);
  assert.equal(starts.length, 3);
  assert.ok(starts[1] - starts[0] >= 2_000);
  assert.ok(starts[2] - starts[1] >= 1_100);
});

test("search retries a connection or temporary service failure but never loops", async () => {
  for (const failure of ["network", "service"]) {
    let calls = 0;
    await assert.rejects(
      searchWeb("desk", {
        apiKey: `bounded-retry-${failure}`,
        fetchImpl: async () => {
          calls++;
          if (failure === "network")
            throw new TypeError("private upstream details");
          return new Response("private upstream details", { status: 503 });
        },
      }),
      (error) =>
        error instanceof WebSearchError &&
        error.code === "WEB_SEARCH_UNAVAILABLE" &&
        !error.message.includes("private"),
    );
    assert.equal(calls, 2);
  }
});

test("authentication and exhausted monthly quotas do not retry", async () => {
  for (const status of [401, 403, 429]) {
    let calls = 0;
    await assert.rejects(
      searchWeb("desk", {
        apiKey: `permanent-search-error-${status}`,
        fetchImpl: async () => {
          calls++;
          return new Response("secret", {
            status,
            headers: {
              "X-RateLimit-Remaining": "0, 0",
              "X-RateLimit-Reset": "1, 2592000",
            },
          });
        },
      }),
      (error) =>
        error instanceof WebSearchError &&
        error.code ===
          (status === 429 ? "WEB_SEARCH_QUOTA" : "WEB_SEARCH_AUTH"),
    );
    assert.equal(calls, 1);
  }
});

test("cancelling during retry cooldown prevents another provider request", async () => {
  const controller = new AbortController();
  let calls = 0;
  const searching = searchWeb(
    "desk",
    {
      apiKey: "cancel-retry-key",
      fetchImpl: async () => {
        calls++;
        return new Response("busy", { status: 429 });
      },
    },
    controller.signal,
  );
  await delay(20);
  controller.abort();
  await assert.rejects(
    searching,
    (error) =>
      error instanceof WebSearchError && error.code === "REQUEST_CANCELLED",
  );
  assert.equal(calls, 1);
});

test("fetch deadlines abort the upstream request and do not retry timeouts", async () => {
  let calls = 0;
  let upstreamSignal: AbortSignal | null | undefined;
  await assert.rejects(
    searchWeb("desk", {
      apiKey: "fetch-timeout-key",
      timeoutMs: 20,
      fetchImpl: async (_input, init) => {
        calls++;
        upstreamSignal = init?.signal;
        await delay(1_000, undefined, { signal: init?.signal ?? undefined });
        return Response.json({ web: { results: [] } });
      },
    }),
    (error) =>
      error instanceof WebSearchError && error.code === "WEB_SEARCH_TIMEOUT",
  );
  assert.equal(calls, 1);
  assert.equal(upstreamSignal?.aborted, true);
});

test("queue admission times out without fetching and releases the next waiter", async () => {
  const config = {
    apiKey: "bounded-admission-key",
    queueTimeoutMs: 30,
    fetchImpl: (async () =>
      Response.json({ web: { results: [] } })) as typeof fetch,
  };
  await searchWeb("desk", config);
  let calls = 0;
  await assert.rejects(
    searchWeb("chair", {
      ...config,
      fetchImpl: async () => {
        calls++;
        return Response.json({ web: { results: [] } });
      },
    }),
    (error) =>
      error instanceof WebSearchError && error.code === "WEB_SEARCH_BUSY",
  );
  assert.equal(calls, 0);
  assert.deepEqual(
    await searchWeb("lamp", { ...config, queueTimeoutMs: 2_000 }),
    [],
  );
});

test("queued and cooldown waits cancel without fetching or blocking independent keys", async () => {
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  let finish!: () => void;
  const pendingFetch = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let requests = 0;
  const config = {
    apiKey: "cancelled-queue-key",
    fetchImpl: (async () => {
      requests++;
      entered();
      await pendingFetch;
      return Response.json({ web: { results: [] } });
    }) as typeof fetch,
  };
  const first = searchWeb("desk", config);
  await started;
  try {
    const controller = new AbortController();
    const waiting = searchWeb("chair", config, controller.signal);
    controller.abort();
    await assert.rejects(
      waiting,
      (error) =>
        error instanceof WebSearchError && error.code === "REQUEST_CANCELLED",
    );
    assert.equal(requests, 1);
    assert.deepEqual(
      await searchWeb("lamp", {
        apiKey: "independent-key",
        fetchImpl: async () => Response.json({ web: { results: [] } }),
      }),
      [],
    );
  } finally {
    finish();
    await first;
  }
  const cooldownController = new AbortController();
  const cooling = searchWeb("shelf", config, cooldownController.signal);
  // Let the queue acquire its turn and enter the cooldown delay.
  await delay(5);
  cooldownController.abort();
  await assert.rejects(
    cooling,
    (error) =>
      error instanceof WebSearchError && error.code === "REQUEST_CANCELLED",
  );
  assert.equal(requests, 1);
});

test("offer discovery discards irrelevant page types before taking five results and keeps images", async () => {
  const actualOffer = "https://www.ricardo.ch/fr/a/white-desk-123456789/";
  let outgoingQuery = "";
  const result = await searchWeb("white desk Lausanne", {
    apiKey: "offer-policy-key",
    fetchImpl: async (input) => {
      outgoingQuery = new URL(String(input)).searchParams.get("q")!;
      return Response.json({
        web: {
          results: [
            ...Array.from({ length: 10 }, (_, i) => ({
              title: "Not an individual offer",
              url: `https://www.ricardo.ch/fr/c/furniture-${i}/`,
            })),
            {
              title: "Actual white desk",
              url: actualOffer,
              description: "CHF 65",
              thumbnail: { src: "https://imgs.search.brave.com/desk.jpg" },
            },
            { title: "Duplicate", url: actualOffer },
            {
              title: "Seller profile",
              url: "https://www.anibis.ch/fr/seller?id=123",
            },
          ],
        },
      });
    },
  });
  assert.match(outgoingQuery, /site:ricardo.ch/);
  assert.deepEqual(result, [
    {
      title: "Actual white desk",
      url: actualOffer,
      snippet: "CHF 65",
      imageUrl: "https://imgs.search.brave.com/desk.jpg",
    },
  ]);
});

test("selected marketplace is authoritative despite provider and model site overrides", async () => {
  let outgoing = "";
  const results = await searchWeb("desk site:ricardo.ch", {
    apiKey: "selected-source-key",
    source: "Anibis",
    fetchImpl: async (input) => {
      outgoing = new URL(String(input)).searchParams.get("q")!;
      return Response.json({
        web: {
          results: [
            {
              title: "Wrong source",
              url: "https://www.ricardo.ch/fr/a/desk-123456789/",
            },
            {
              title: "Selected source",
              url: "https://www.anibis.ch/fr/vi/lausanne/123456789",
            },
          ],
        },
      });
    },
  });
  assert.match(outgoing, /site:anibis.ch/);
  assert.doesNotMatch(outgoing, /site:ricardo.ch/);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Selected source");
  await assert.rejects(
    searchWeb("desk", { apiKey: "key", source: "Unknown platform" }),
    (error) =>
      error instanceof WebSearchError && error.code === "UNSUPPORTED_SOURCE",
  );
  assert.deepEqual(
    await searchWeb("desk", {
      apiKey: "key",
      source: "takeover",
      fetchImpl: async () => {
        throw new Error("Must not search web");
      },
    }),
    [],
  );
});
