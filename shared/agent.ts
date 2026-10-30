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

export type HealthResponse = {
  mode: "live" | "unconfigured";
  webSearchConfigured?: boolean;
  configured: boolean;
  model: string;
};

export type AgentErrorResponse = {
  error: { code: string; message: string };
};
