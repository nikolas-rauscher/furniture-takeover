import type { Product } from "./marketplace.ts";

// Fixed optional seed records only. Image provenance: scripts/fixtures/ebay-research.json.
const samplePhotos: Record<string, { image: string; url: string }> = {
  "9e32232f-8942-5138-b6e6-2623d2bc3a19": {
    image: "https://i.ebayimg.com/thumbs/images/g/NM4AAeSwzM5qa0NI/s-l500.jpg",
    url: "https://www.ebay.de/itm/168607888789",
  },
  "1a47d652-50ed-56f6-a112-3d37a12f090a": {
    image: "https://i.ebayimg.com/thumbs/images/g/73EAAeSwYUhqYfVD/s-l500.jpg",
    url: "https://www.ebay.de/itm/398391085374",
  },
  "b8ae5504-35d2-53a9-988e-6214241d5183": {
    image: "https://i.ebayimg.com/thumbs/images/g/J-cAAeSwVT5qy9xZ/s-l500.jpg",
    url: "https://www.ebay.de/itm/960053697342",
  },
  "08fba64c-b9a8-50b2-9e51-31e93a762c24": {
    image: "https://i.ebayimg.com/thumbs/images/g/m9QAAeSwQnZq31qk/s-l500.jpg",
    url: "https://www.ebay.de/itm/206655349493",
  },
  "afce03e9-9fb8-588c-b404-b431ed90cf07": {
    image: "https://i.ebayimg.com/thumbs/images/g/JyoAAOSw3ppl4KJA/s-l500.jpg",
    url: "https://www.ebay.de/itm/375283897362",
  },
  "95acdc3a-91d3-57c6-8904-36edbc0d2349": {
    image: "https://i.ebayimg.com/thumbs/images/g/HGAAAeSwu2RpdPq2/s-l500.jpg",
    url: "https://www.ebay.de/itm/177804573336",
  },
};

export function presentSampleListing(product: Product): Product {
  const photo = samplePhotos[product.id];
  if (!product.demo || !photo) return product;
  const hasPhoto = Boolean(product.image || product.images?.some(Boolean));
  const description = product.description.split("SYNTHETIC DEMO")[0].trim();
  const illustration =
    product.id === "08fba64c-b9a8-50b2-9e51-31e93a762c24"
      ? " Photo illustrates the same bookshelf model."
      : "";
  return {
    ...product,
    title: product.title.replace(/^(?:\[Demo\]\s*|DEMO\s*·\s*)/i, ""),
    description: `${description}\n\nSample listing for testing; price and pickup details are fictional. This seller cannot reply.${illustration}`,
    seller: product.seller.replace(/^Demo Seller — /, ""),
    ...(!hasPhoto
      ? { image: photo.image, images: [photo.image], photoSourceUrl: photo.url }
      : {}),
  };
}
