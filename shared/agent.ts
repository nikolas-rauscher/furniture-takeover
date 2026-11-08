export type AgentIntent = "search" | "listing" | "reply";

export type AssistRequest = {
  intent: AgentIntent;
  text: string;
  image?: string;
  images?: string[];
  conversation?: {
    role: "buyer" | "seller";
    listing: {
      title: string;
      description?: string;
      price?: number;
      location?: string;
      condition?: string;
      dimensions?: string;
      pickup?: string;
      status?: string;
    };
    messages: { role: "self" | "other"; text: string }[];
  };
  context?: {
    location?: string;
    currentQuery?: string;
    maxPrice?: number;
    radius?: number;
    pickupBy?: string;
  };
};

export type AgentMetadata = {
  query?: string;
  maxPrice?: number;
  radius?: number;
  pickupBy?: string;
  title?: string;
  description?: string;
  price?: number | null;
  condition?: string | null;
  dimensions?: string | null;
  location?: string;
  keywords: string[];
};

export type AssistResponse = {
  mode: "live";
  model: string;
  suggestions: string[];
  missingDetails: string[];
  metadata: AgentMetadata;
};

/** Photos are referenced by their position in the submitted list. */
/** `itemCount` is the seller's own count when the first sorting was wrong. */
export type PhotoGroupRequest = { images: string[]; itemCount?: number };
export type PhotoGroup = { photos: number[]; label: string };
export type PhotoGroupResponse = {
  mode: "live";
  model: string;
  groups: PhotoGroup[];
};
export type AgentQuota = { limit: number; remaining: number; resetAt: string };

export type HealthResponse = {
  mode: "live" | "unconfigured";
  webSearchConfigured?: boolean;
  configured: boolean;
  model: string;
  quota?: AgentQuota;
};

export type AgentErrorResponse = {
  error: { code: string; message: string };
};
