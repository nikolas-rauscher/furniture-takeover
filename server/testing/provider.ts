// Fake provider transport shared by service and HTTP boundary tests.
export const output = {
  suggestions: ["white desk within 5 km"],
  missingDetails: ["Pickup deadline"],
  metadata: { query: "white desk", maxPrice: 80, keywords: ["white", "desk"] },
};
export const completion = (data: unknown, finishReason = "stop") =>
  new Response(
    JSON.stringify({
      choices: [
        {
          finish_reason: finishReason,
          message: {
            content: typeof data === "string" ? data : JSON.stringify(data),
          },
        },
      ],
    }),
    { status: 200 },
  );
export const fakeConfig = {
  apiKey: "test-key-never-sent",
  baseUrl: "https://mock.invalid",
  model: "deepseek-flash",
};
export const fakeFetch = (
  fn: (input: string, init?: RequestInit) => Promise<Response>,
): typeof fetch => fn as typeof fetch;
