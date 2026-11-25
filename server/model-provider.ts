import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const modelProviders = ["deepseek", "openai"] as const;
export type ModelProvider = (typeof modelProviders)[number];
export type OpenAIReasoningEffort = "none" | "low";

export const providerBaseUrls: Record<ModelProvider, string> = {
  deepseek: "https://api.deepseek.com",
  openai: "https://api.openai.com/v1",
};

/** Where Pako's requests go: one provider, its key and its model. */
export type ModelAccess = {
  provider: ModelProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  openaiReasoningEffort?: OpenAIReasoningEffort;
};

export function languageModel(
  access: ModelAccess,
  fetchImpl?: typeof fetch,
): LanguageModel {
  const settings = {
    apiKey: access.apiKey,
    baseURL: access.baseUrl,
    fetch: fetchImpl,
  };
  return access.provider === "openai"
    ? createOpenAI(settings).responses(access.model)
    : createDeepSeek(settings)(access.model);
}

export function deepseekThinkingOptions(thinking: boolean) {
  return {
    deepseek: {
      thinking: {
        type: thinking ? ("enabled" as const) : ("disabled" as const),
      },
      ...(thinking && { reasoningEffort: "low" as const }),
    },
  };
}

export function readOpenAIReasoningEffort(
  model: string | undefined,
  effort = "low",
): OpenAIReasoningEffort {
  if (effort !== "none" && effort !== "low")
    throw new Error("OPENAI_REASONING_EFFORT must be low or none.");
  if (model === "gpt-6.2-sol" && effort === "none")
    throw new Error("gpt-6.2-sol requires at least low reasoning effort.");
  return effort;
}

export function thinkingOptions(
  deepseekThinking: boolean,
  access?: Pick<ModelAccess, "model" | "openaiReasoningEffort">,
  reasoningSummary: "auto" | null = "auto",
) {
  const reasoningEffort = readOpenAIReasoningEffort(
    access?.model,
    access?.openaiReasoningEffort,
  );
  return {
    ...deepseekThinkingOptions(deepseekThinking),
    openai: {
      reasoningEffort,
      reasoningSummary: reasoningEffort === "none" ? null : reasoningSummary,
      store: false,
      textVerbosity: "low" as const,
    },
  };
}
