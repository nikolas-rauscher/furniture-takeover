/** Decode browser photo previews locally; fetching data URLs violates the production CSP. */
export function listingPhotoBlob(image: string): Blob {
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(image);
  if (!match)
    throw new Error("This photo could not be read. Please add it again.");
  try {
    const bytes = Uint8Array.from(atob(match[2]), (character) =>
      character.charCodeAt(0),
    );
    if (!bytes.length) throw new Error("Empty photo");
    return new Blob([bytes], { type: match[1] });
  } catch {
    throw new Error("This photo could not be read. Please add it again.");
  }
}
