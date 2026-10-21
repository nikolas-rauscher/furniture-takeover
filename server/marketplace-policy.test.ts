import assert from "node:assert/strict";
import test from "node:test";
import { isMarketplaceOffer, marketplaceQuery } from "./marketplace-policy.ts";

test("individual offer URLs pass across supported marketplaces without fixed item categories", () => {
  for (const url of [
    "https://www.ricardo.ch/fr/a/bureau-pupitre-ecolier-ancien-1296631712/",
    "https://www.anibis.ch/fr/vi/vaud/maison/mobilier/bureau/1073887083",
    "https://www.anibis.ch/de/vi/1073990956",
    "https://www.tutti.ch/de/vi/waadt/haushalt/moebel/desk/1234567",
    "https://www.petitesannonces.ch/a/8027100",
    "https://www.kleinanzeigen.de/s-anzeige/desk/1234567890-93-1234",
    "https://www.ebay.de/itm/123456789012?var=9",
    "https://www.ebay.co.uk/itm/Chair/123456789012",
  ])
    assert.equal(isMarketplaceOffer(url), true, url);
});

test("categories, seller profiles, discussions, unrelated sites and spoofed hosts are not offers", () => {
  for (const url of [
    "https://www.ricardo.ch/fr/c/mobilier-de-bureau-39046/",
    "https://www.ricardo.ch/de/shop/seller/",
    "https://www.anibis.ch/fr/seller?id=100",
    "https://www.tutti.ch/fr/vi/vaud/immobilier/objets-commerciaux/bureau/10010769062",
    "https://www.petitesannonces.ch/recherche/?tid=2806",
    "https://www.kleinanzeigen.de/s-moebel/k0",
    "https://www.ebay.de/sch/i.html?_nkw=desk",
    "https://www.reddit.com/r/Switzerland/comments/id/title/",
    "https://apps.apple.com/app/id123",
    "https://ricardo.ch.evil.example/fr/a/desk-123/",
    "https://evil.ricardo.ch/fr/a/desk-123/",
    "https://user:secret@ricardo.ch/fr/a/desk-123/",
    "http://www.ricardo.ch/fr/a/desk-123/",
    "https://www.ricardo.ch/fr/a/desk-123/%2f..",
  ])
    assert.equal(isMarketplaceOffer(url), false, url);
});

test("offer query narrows discovery while preserving explicit site operators and long inputs", () => {
  assert.match(marketplaceQuery("white desk Lausanne"), /site:ricardo.ch/);
  assert.equal(marketplaceQuery("desk site:anibis.ch"), "desk site:anibis.ch");
  const long = "desk ".repeat(60).trim();
  assert.equal(marketplaceQuery(long), long);
});

test("marketplace property/rental snippets do not become furniture resale offers", () => {
  const url = "https://www.petitesannonces.ch/a/7835082";
  assert.equal(
    isMarketplaceOffer(url, "Charmant bureau à louer au coeur de Lausanne"),
    false,
  );
  assert.equal(isMarketplaceOffer(url, "Office space for rent"), false);
  assert.equal(isMarketplaceOffer(url, "Desk", "CHF 200 per month"), false);
  assert.equal(
    isMarketplaceOffer(url, "Bureau à donner", "Collection in Lausanne. CHF 0"),
    true,
  );
});
