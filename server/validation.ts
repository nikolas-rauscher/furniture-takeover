import {
  MAX_LISTING_PHOTOS,
  MAX_UPLOAD_PHOTO_BYTES,
} from "../shared/listingPhotos.ts";
import type {
  AgentMetadata,
  AssistRequest,
  AssistResponse,
} from "../shared/agent.ts";
import { AgentError, invalidOutput } from "./errors.ts";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) =>
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

function text(value: unknown, max: number, fail: () => Error): string {
  if (typeof value !== "string" || value.length > max) throw fail();
  return value.trim();
}

function number(value: unknown, max: number, fail: () => Error): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw fail();
  return value;
}

export function validateRequest(value: unknown): AssistRequest {
  const fail = () =>
    new AgentError(
      400,
      "INVALID_REQUEST",
      "Provide an intent, text of up to 4,000 characters, and valid optional details.",
    );
  if (
    !record(value) ||
    !["search", "listing", "reply"].includes(String(value.intent))
  )
    throw fail();
  const result: AssistRequest = {
    intent: value.intent as AssistRequest["intent"],
    text: text(value.text, 4000, fail),
  };
  if (result.intent === "reply") {
    const conversation = value.conversation;
    if (
      !record(conversation) ||
      !["buyer", "seller"].includes(String(conversation.role)) ||
      !record(conversation.listing) ||
      !Array.isArray(conversation.messages) ||
      conversation.messages.length > 12
    )
      throw fail();
    const listing: NonNullable<AssistRequest["conversation"]>["listing"] = {
      title: text(conversation.listing.title, 180, fail),
    };
    if (!listing.title) throw fail();
    for (const [field, max] of [
      ["description", 2400],
      ["location", 180],
      ["condition", 160],
      ["dimensions", 160],
      ["pickup", 500],
      ["status", 20],
    ] as const)
      if (conversation.listing[field] !== undefined)
        listing[field] = text(conversation.listing[field], max, fail);
    if (conversation.listing.price !== undefined)
      listing.price = number(conversation.listing.price, 1_000_000, fail);
    result.conversation = {
      role: conversation.role as "buyer" | "seller",
      listing,
      messages: conversation.messages.map((message) => {
        if (
          !record(message) ||
          !["self", "other"].includes(String(message.role))
        )
          throw fail();
        const body = text(message.text, 4000, fail);
        if (!body) throw fail();
        return { role: message.role as "self" | "other", text: body };
      }),
    };
  }
  if (value.context !== undefined) {
    if (!record(value.context)) throw fail();
    const source = value.context;
    result.context = {};
    if (source.location !== undefined)
      result.context.location = text(source.location, 120, fail);
    if (source.currentQuery !== undefined)
      result.context.currentQuery = text(source.currentQuery, 500, fail);
    if (source.maxPrice !== undefined)
      result.context.maxPrice = number(source.maxPrice, 1_000_000, fail);
    if (source.radius !== undefined)
      result.context.radius = number(source.radius, 500, fail);
    if (source.pickupBy !== undefined) {
      const date = text(source.pickupBy, 10, fail);
      if (date && !validDate(date)) throw fail();
      result.context.pickupBy = date;
    }
  }
  if (value.image !== undefined) {
    if (value.intent !== "listing" || typeof value.image !== "string")
      throw new AgentError(
        400,
        "INVALID_IMAGE",
        "Photos can only be submitted when creating a listing draft.",
      );
    const match = value.image.match(
      /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match || match[2].length % 4 !== 0 || match[2].length > 2_796_204)
      throw new AgentError(
        400,
        "INVALID_IMAGE",
        "Use a JPG, PNG or WebP photo up to 2 MB.",
      );
    const bytes = Buffer.from(match[2], "base64");
    const signatureMatches =
      match[1] === "jpeg"
        ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
        : match[1] === "png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes.subarray(0, 4).toString() === "RIFF" &&
            bytes.subarray(8, 12).toString() === "WEBP";
    if (!signatureMatches || bytes.length > 2 * 1024 * 1024)
      throw new AgentError(
        400,
        "INVALID_IMAGE",
        "Use a JPG, PNG or WebP photo up to 2 MB.",
      );
    result.image = value.image;
  }
  if (value.images !== undefined) {
    if (
      value.intent !== "listing" ||
      !Array.isArray(value.images) ||
      value.images.length > MAX_LISTING_PHOTOS
    )
      throw new AgentError(
        400,
        "INVALID_IMAGE",
        `Use up to ${MAX_LISTING_PHOTOS} listing photos.`,
      );
    result.images = [
      ...new Set(
        value.images.map(
          (image) =>
            validateRequest({ intent: "listing", text: "", image }).image!,
        ),
      ),
    ];
    const allImages = [
      ...new Set([...(result.image ? [result.image] : []), ...result.images]),
    ];
    if (
      allImages.length > MAX_LISTING_PHOTOS ||
      allImages.reduce(
        (size, image) =>
          size + Buffer.from(image.split(",")[1], "base64").length,
        0,
      ) > MAX_UPLOAD_PHOTO_BYTES
    )
      throw new AgentError(
        400,
        "INVALID_IMAGE",
        "The photo collection is too large. Use smaller photos.",
      );
  }
  if (!result.text && !result.image && !result.images?.length)
    throw new AgentError(
      400,
      "EMPTY_REQUEST",
      "Describe what you need or add a listing photo.",
    );
  return result;
}

function strings(value: unknown, count: number, length: number): string[] {
  if (!Array.isArray(value) || value.length > count) throw invalidOutput();
  return [
    ...new Set(
      value.map((item) => text(item, length, invalidOutput)).filter(Boolean),
    ),
  ];
}

export function validateAgentOutput(
  value: unknown,
): Pick<AssistResponse, "suggestions" | "missingDetails" | "metadata"> {
  if (!record(value) || !record(value.metadata)) throw invalidOutput();
  const metadata: AgentMetadata = {
    keywords: strings(value.metadata.keywords ?? [], 12, 50),
  };
  const source = value.metadata;
  for (const [key, max] of [
    ["query", 500],
    ["title", 90],
    ["description", 2400],
    ["location", 120],
  ] as const) {
    if (source[key] !== undefined && source[key] !== null)
      metadata[key] = text(source[key], max, invalidOutput);
  }
  for (const [key, max] of [
    ["maxPrice", 1_000_000],
    ["radius", 500],
  ] as const) {
    if (source[key] !== undefined && source[key] !== null)
      metadata[key] = number(source[key], max, invalidOutput);
  }
  if (source.pickupBy !== undefined && source.pickupBy !== null) {
    const date = text(source.pickupBy, 10, invalidOutput);
    if (date && !validDate(date)) throw invalidOutput();
    metadata.pickupBy = date;
  }
  if (source.price !== undefined)
    metadata.price =
      source.price === null
        ? null
        : number(source.price, 1_000_000, invalidOutput);
  for (const key of ["condition", "dimensions"] as const) {
    if (source[key] !== undefined)
      metadata[key] =
        source[key] === null
          ? null
          : text(source[key], 160, invalidOutput) || null;
  }
  return {
    suggestions: strings(value.suggestions ?? [], 4, 160),
    missingDetails: strings(value.missingDetails ?? [], 6, 160),
    metadata,
  };
}
