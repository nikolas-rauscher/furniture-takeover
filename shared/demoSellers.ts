/** The students behind the demo listings. In account mode they are inert profiles that cannot sign in. */
export const demoSellers = [
  { id: "df5ead21-cb17-52ad-af2d-b6b167200001", name: "Léa" },
  { id: "df5ead21-cb17-52ad-af2d-b6b167200002", name: "Arjun" },
  { id: "df5ead21-cb17-52ad-af2d-b6b167200003", name: "Mia" },
  { id: "df5ead21-cb17-52ad-af2d-b6b167200004", name: "Jonas" },
  { id: "df5ead21-cb17-52ad-af2d-b6b167200005", name: "Sofia" },
  { id: "df5ead21-cb17-52ad-af2d-b6b167200006", name: "Noé" },
] as const;

export type DemoSellerName = (typeof demoSellers)[number]["name"];
