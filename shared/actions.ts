/** Image-free listing facts supplied by the seller for one agent turn. */
export type AgentListingDraft = {
  title: string;
  description: string;
  price: number | null;
  condition: string;
  dimensions: string;
  location: string;
  pickup: string;
  raw: string;
};

export type SellerEvidence = { kind: "seller"; quote: string };
export type SourceEvidence = {
  kind: "source";
  sourceId: string;
  quote: string;
};
export type AgentActionEvidence = SellerEvidence | SourceEvidence;
export type AgentListingPatch = Partial<Omit<AgentListingDraft, "raw">>;
export type AgentPreferencesPatch = {
  query?: string;
  maxPrice?: number;
  radius?: number;
  pickupBy?: string;
  condition?: string;
  source?: string;
  location?: string;
};
export type AgentQuestionEvent = {
  type: "question";
  id: string;
  question: string;
  choices?: string[];
  input?: { type: "price"; min: number; max: number; step: number; value?: number };
};
export type AgentListingPatchEvent = {
  type: "listing_patch";
  id: string;
  patch: AgentListingPatch;
  reason: string;
  evidence: AgentActionEvidence[];
  /** Research suggestions always require acceptance; they never silently set a price. */
  requiresAcceptance: boolean;
};
export type AgentPreferencesPatchEvent = {
  type: "preferences_patch";
  id: string;
  patch: AgentPreferencesPatch;
  reason: string;
  evidence: SellerEvidence[];
};
export type AgentActionEvent =
  AgentQuestionEvent | AgentListingPatchEvent | AgentPreferencesPatchEvent;
