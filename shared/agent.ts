export type AgentIntent = "search" | "listing";

export type AssistRequest = {
  intent: AgentIntent;
  text: string;
  image?: string;
  images?: string[];
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
