import type { AgentRunRequest } from "../shared/runs.ts";

const categories: [RegExp, string][] = [
  [
    /\b(?:laptop|macbook|thinkpad|notebook|computer)\b/i,
    "model year or chip, screen size (13/14/16 inch), storage (256 GB/512 GB/1 TB), battery health or cycles, charger included",
  ],
  [
    /\b(?:phone|iphone|smartphone|pixel|galaxy)\b/i,
    "model, storage, battery health, screen condition, charging cable",
  ],
  [
    /\b(?:headphones?|earbuds?|airpods|speakers?|audio|wh-1000xm\d)\b/i,
    "model, battery life, cushion wear, case and cable included",
  ],
  [
    /\b(?:desk|table|chair|sofa|bed|shelf|wardrobe|furniture|bookcase)\b/i,
    "dimensions (width × depth × height), material, condition, disassembly, floor or lift access",
  ],
  [
    /\b(?:bike|bicycle|velo)\b/i,
    "frame size, wheel size, brake condition, last service, included lock",
  ],
  [
    /\b(?:clothing|jacket|coat|shirt|dress|jeans|shoes)\b/i,
    "label size, fit, material, wear or damage",
  ],
  [
    /\b(?:appliance|microwave|kettle|blender|toaster|coffee machine)\b/i,
    "model, capacity, working condition, included accessories",
  ],
  [
    /\b(?:books?|textbook)\b/i,
    "edition, language, annotations, cover condition",
  ],
];

export function listingKeyFacts(request: AgentRunRequest) {
  const context = request.context;
  const draft = context?.currentDraft;
  const hints = [
    draft?.title,
    ...(context?.photoAnalysis?.keywords ?? []),
    draft?.raw,
    draft?.description,
  ];
  for (const hint of hints) {
    const category = hint && categories.find(([pattern]) => pattern.test(hint));
    if (category) return category[1];
  }
  return "model or size, working condition, included parts, wear or defects";
}
