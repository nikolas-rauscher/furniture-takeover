/** Real addresses checked against the venue's own website on 2026-10-13.
 * Suggested meeting points for fictional demo inventory, never seller addresses. */
export const legacyCampusPickupPoints = [
  {
    name: "Rolex Learning Center",
    address: "Allée de Savoie, 1024 Ecublens",
    area: "EPFL · Ecublens",
    sourceUrl: "https://www.epfl.ch/campus/library/practical-information/",
  },
  {
    name: "SwissTech Convention Center",
    address: "Route Louis-Favre 2, 1024 Ecublens",
    area: "EPFL Quartier Nord",
    sourceUrl: "https://www.stcc.ch/",
  },
  {
    name: "Vortex · outside reception",
    address: "Route de Praz-Véguey 29, 1022 Chavannes-près-Renens",
    area: "Chavannes-près-Renens",
    sourceUrl:
      "https://www.fmel.ch/en/article/l%E2%80%99administration-prend-ses-quartiers-au-vortex-12",
  },
  {
    name: "Place François Silvant",
    address: "Route du Bois 27, 1024 Ecublens",
    area: "Ecublens · Le Croset",
    sourceUrl: "https://www.ecublens.ch/decouvrir/plan-de-ville?view=plans",
  },
] as const;

export const campusPickupPoints = [
  {
    name: "FMEL Atrium · outside entrance",
    address: "Avenue Louis-Favre 4, 1024 Ecublens",
    area: "FMEL Atrium · Ecublens",
    sourceUrl: "https://www.fmel.ch/maison/atrium",
  },
  {
    name: "FMEL Triaudes · outside entrance",
    address: "Chemin des Triaudes 5–20, 1024 Ecublens",
    area: "FMEL Triaudes · Ecublens",
    sourceUrl: "https://www.fmel.ch/maison/triaudes",
  },
  {
    name: "FMEL Vortex · outside reception",
    address: "Route de Praz-Véguey 29, 1022 Chavannes-près-Renens",
    area: "FMEL Vortex · Chavannes",
    sourceUrl: "https://www.fmel.ch/maison/vortex",
  },
  {
    name: "FMEL Ochettes · outside entrance",
    address: "Chemin des Berges 12–14, 1022 Chavannes-près-Renens",
    area: "FMEL Ochettes · Chavannes",
    sourceUrl: "https://www.fmel.ch/maison/ochettes",
  },
  {
    name: "FMEL Bourdonnette · outside entrance",
    address: "Route de Chavannes 40–52, 1007 Lausanne",
    area: "FMEL Bourdonnette · Lausanne",
    sourceUrl: "https://www.fmel.ch/maison/bourdonnette",
  },
  legacyCampusPickupPoints[0],
  legacyCampusPickupPoints[1],
  legacyCampusPickupPoints[3],
] as const;

// Only the exact old demo assignments are migrated; a custom address is preserved.
export function isLegacyCampusPickupPoint(point: unknown): boolean {
  if (!point || typeof point !== "object") return false;
  const candidate = point as Record<string, unknown>;
  return legacyCampusPickupPoints.some(
    (old) =>
      old.name === candidate.name &&
      old.address === candidate.address &&
      old.area === candidate.area &&
      old.sourceUrl === candidate.sourceUrl,
  );
}

export function campusPickupPoint(index: number) {
  return campusPickupPoints[index % campusPickupPoints.length];
}
