const furnitureTitle =
  /\b(?:armchair|wardrobe|cabinet|dresser|chest|shelf|shelves|bookcase|desk|table|sofa|couch|bed|chair|sideboard|cupboard|armoire|commode|étagère|bureau|lit|chaise|buffet|meuble|schreibtisch|tisch|schrank|regal|bett|stuhl)\b/i;
const cargoEnvelopeCm = [180, 105, 80];

type TransportGuidance = {
  label: string;
  message: string;
  note: string;
};

function dimensionsInCentimetres(value: string) {
  const measurements = [
    ...value.matchAll(/(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/gi),
  ];
  if (measurements.length !== 3) return null;

  const trailingUnit = value.match(/(?:mm|cm|m)\s*$/i)?.[0]
    .trim()
    .toLowerCase();
  const values = measurements.map((match) => {
    const number = Number(match[1].replace(",", "."));
    const unit = (match[2]?.toLowerCase() || trailingUnit) as
      | "mm"
      | "cm"
      | "m"
      | undefined;
    if (!unit || !Number.isFinite(number) || number <= 0) return null;
    return number * (unit === "m" ? 100 : unit === "mm" ? 0.1 : 1);
  });
  return values.some((dimension) => dimension === null)
    ? null
    : (values as number[]);
}

function fitsCargoEnvelope(dimensions: number[]) {
  const fits = (remaining: number[], index: number): boolean => {
    if (index === dimensions.length) return true;
    return remaining.some(
      (limit, slot) =>
        dimensions[index] <= limit &&
        fits(
          remaining.filter((_, candidate) => candidate !== slot),
          index + 1,
        ),
    );
  };
  return fits(cargoEnvelopeCm, 0);
}

export function transportGuidance(
  title: string,
  dimensions: string,
): TransportGuidance | null {
  if (!furnitureTitle.test(title)) return null;
  const measured = dimensionsInCentimetres(dimensions);
  if (!measured)
    return {
      label: "Transport estimate",
      message: "Confirm the width × depth × height in cm with the seller.",
      note: "Vehicle choice depends on the item's largest transport dimensions.",
    };

  return fitsCargoEnvelope(measured)
    ? {
        label: "Transport estimate",
        message: "An estate car may be enough.",
        note: "Check your vehicle's usable cargo space and loading opening; this is only an estimate.",
      }
    : {
        label: "Transport estimate",
        message: "A van is likely needed.",
        note: "Check the item's largest transport dimensions against the vehicle's usable cargo space and loading opening.",
      };
}
